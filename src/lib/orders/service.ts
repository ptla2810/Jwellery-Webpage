import "server-only";
import { Prisma, type OrderStatus, type PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { getCartView, priceLines } from "../cart";
import { loadCoupon } from "../coupons";
import { estimateDelivery, PINCODE_RE } from "../delivery";
import { getSetting } from "../settings";
import { paymentSimulatorEnabled, razorpayConfig } from "../env";
import { randomToken } from "../auth/tokens";
import { metalSummary } from "../catalog/labels";
import { syncProductDerived } from "../catalog/sync";
import { createRazorpayOrder } from "../payments/razorpay";
import { OutOfStockError, releaseOrderStock, reserveStock } from "./inventory";
import { ADMIN_TRANSITIONS, canTransition, ORDER_STATUS_LABEL, PAYMENT_PENDING_MINUTES } from "./status";
import { sendEmail } from "../email";
import { formatINR } from "../money";
import { siteUrl } from "../env";

export class CheckoutError extends Error {}

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
] as const;

export const phoneSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, "").replace(/^(\+91|0)/, ""))
  .refine((s) => /^[6-9]\d{9}$/.test(s), "Enter a valid 10-digit Indian mobile number");

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the recipient's name").max(80),
  phone: phoneSchema,
  line1: z.string().trim().min(5, "Enter house/flat number and street").max(120),
  line2: z.string().trim().max(120).optional().default(""),
  landmark: z.string().trim().max(80).optional().default(""),
  city: z.string().trim().min(2, "Enter city").max(60),
  state: z.enum(INDIAN_STATES, { message: "Select a state" }),
  postalCode: z.string().trim().regex(PINCODE_RE, "Enter a valid 6-digit PIN code"),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const checkoutSchema = z.object({
  checkoutToken: z.string().regex(/^[A-Za-z0-9_-]{20,64}$/),
  contact: z.object({
    name: z.string().trim().min(2, "Enter your name").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email address").max(120),
    phone: phoneSchema,
  }),
  address: addressSchema,
  deliveryOption: z.enum(["standard", "express"]),
  paymentMethod: z.enum(["RAZORPAY", "COD", "TEST_SIMULATOR"]),
  customerNote: z.string().trim().max(300).optional().default(""),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export async function availablePaymentMethods(total?: number) {
  const shipping = await getSetting("shipping");
  return {
    razorpay: !!razorpayConfig(),
    simulator: paymentSimulatorEnabled() && !razorpayConfig(),
    cod: shipping.codEnabled && (total == null || total <= shipping.codMaxOrderValue),
    codMaxOrderValue: shipping.codMaxOrderValue,
  };
}

function newOrderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0");
  return `AUR${ymd}${rand}`;
}

export type PaymentInit =
  | { kind: "none" }
  | { kind: "razorpay"; keyId: string; providerOrderId: string; amount: number }
  | { kind: "simulator"; providerOrderId: string; amount: number };

export type PlaceOrderResult = { orderId: string; orderNumber: string; status: OrderStatus; payment: PaymentInit };

/**
 * Creates an order from the current cart. Prices, discounts, shipping and tax are recomputed here from the
 * database; nothing price-related is accepted from the client. Idempotent on checkoutToken.
 */
export async function placeOrder(input: CheckoutInput, userId: string | null): Promise<PlaceOrderResult> {
  const existing = await prisma.order.findUnique({ where: { checkoutToken: input.checkoutToken } });
  if (existing) {
    if (existing.userId && existing.userId !== userId) throw new CheckoutError("Invalid checkout session");
    return {
      orderId: existing.id,
      orderNumber: existing.orderNumber,
      status: existing.status,
      payment: existing.status === "PENDING_PAYMENT" ? await startPayment(existing.id) : { kind: "none" },
    };
  }

  const shipping = await getSetting("shipping");
  const estimate = estimateDelivery(input.address.postalCode, shipping);
  if (!estimate.serviceable) throw new CheckoutError(estimate.reason);
  if (input.deliveryOption === "express" && !estimate.express) throw new CheckoutError("Express delivery is not available");

  const cart = await getCartView();
  if (!cart.id || cart.lines.length === 0) throw new CheckoutError("Your cart is empty");
  if (cart.hasIssues) throw new CheckoutError("Some items in your cart are unavailable. Please review your cart.");

  let coupon = null;
  let couponId: string | null = null;
  if (cart.couponInput) {
    const r = await loadCoupon(cart.couponInput, userId);
    if (!r.ok) throw new CheckoutError(r.error);
    coupon = r.rule;
    couponId = r.id;
  }
  const q = await priceLines(cart.lines, { coupon, deliveryOption: input.deliveryOption, paymentMethod: input.paymentMethod });
  if (coupon && q.couponError) throw new CheckoutError(q.couponError);

  const methods = await availablePaymentMethods(q.total);
  if (input.paymentMethod === "COD" && !methods.cod) throw new CheckoutError("Cash on delivery is not available for this order");
  if (input.paymentMethod === "RAZORPAY" && !methods.razorpay) throw new CheckoutError("Online payment is not configured");
  if (input.paymentMethod === "TEST_SIMULATOR" && !methods.simulator) throw new CheckoutError("Test payments are disabled");

  const tax = await getSetting("tax");
  const products = await prisma.product.findMany({
    where: { id: { in: cart.lines.map((l) => l.productId) } },
    select: { id: true, metalType: true, purity: true, grossWeight: true, gemstoneType: true, diamondCarat: true },
  });
  const est = input.deliveryOption === "express" && estimate.express ? estimate.express : estimate.standard;
  const isCod = input.paymentMethod === "COD";

  for (let attempt = 0; attempt < 3; attempt++) {
    const orderNumber = newOrderNumber();
    try {
      const order = await prisma.$transaction(
        async (tx) => {
          // A fresh checkout supersedes earlier unpaid attempts from the same cart.
          const stale = await tx.order.findMany({
            where: { sourceCartId: cart.id, status: { in: ["PENDING_PAYMENT", "PAYMENT_FAILED"] }, inventoryReleased: false },
            select: { id: true, status: true },
          });
          for (const s of stale) {
            await releaseOrderStock(tx, s.id);
            await tx.order.update({ where: { id: s.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
            await tx.orderEvent.create({
              data: { orderId: s.id, type: "STATUS_CHANGE", fromStatus: s.status, toStatus: "CANCELLED", message: "Superseded by a newer checkout" },
            });
          }

          await reserveStock(tx, cart.lines.map((l) => ({ variantId: l.variantId, sku: l.sku, quantity: l.quantity })), orderNumber);

          const created = await tx.order.create({
            data: {
              orderNumber,
              userId,
              email: input.contact.email,
              phone: input.contact.phone,
              customerName: input.contact.name,
              status: isCod ? "CONFIRMED" : "PENDING_PAYMENT",
              paymentStatus: "PENDING",
              paymentMethod: input.paymentMethod as PaymentMethod,
              subtotal: q.subtotal,
              discountTotal: q.discountTotal,
              shippingFee: q.shippingFee,
              codFee: q.codFee,
              taxTotal: q.taxTotal,
              total: q.total,
              couponCode: q.couponCode,
              shippingAddress: input.address,
              deliveryOption: input.deliveryOption,
              estimatedDeliveryFrom: est.from,
              estimatedDeliveryTo: est.to,
              customerNote: input.customerNote || null,
              checkoutToken: input.checkoutToken,
              sourceCartId: cart.id,
              items: {
                create: cart.lines.map((l, i) => {
                  const pl = q.lines[i];
                  const p = products.find((x) => x.id === l.productId)!;
                  return {
                    productId: l.productId,
                    variantId: l.variantId,
                    productName: l.name,
                    productSlug: l.slug,
                    sku: l.sku,
                    variantName: l.variantName,
                    imageUrl: l.image?.url ?? null,
                    metalSummary: metalSummary(p.metalType, p.purity),
                    unitPrice: l.unitPrice,
                    compareAtPrice: l.compareAtPrice,
                    quantity: l.quantity,
                    discountAmount: pl.discountAmount,
                    taxRateBps: tax.gstRateBps,
                    taxAmount: pl.taxAmount,
                    lineTotal: pl.lineTotal,
                    specs: {
                      grossWeight: p.grossWeight?.toString() ?? null,
                      gemstone: p.gemstoneType,
                      diamondCarat: p.diamondCarat?.toString() ?? null,
                      size: l.size,
                    },
                  };
                }),
              },
              events: {
                create: {
                  type: "STATUS_CHANGE",
                  toStatus: isCod ? "CONFIRMED" : "PENDING_PAYMENT",
                  message: isCod ? "Order placed with Cash on Delivery" : "Order created, awaiting payment",
                },
              },
            },
          });

          if (couponId) {
            const ok = await tx.coupon.updateMany({
              where: { id: couponId, isActive: true, OR: [{ usageLimit: null }, { usedCount: { lt: tx.coupon.fields.usageLimit } }] },
              data: { usedCount: { increment: 1 } },
            });
            if (ok.count !== 1) throw new CheckoutError("This coupon has reached its usage limit");
            await tx.couponUsage.create({ data: { couponId, userId, orderId: created.id } });
          }

          for (const pid of new Set(cart.lines.map((l) => l.productId))) {
            const qty = cart.lines.filter((l) => l.productId === pid).reduce((a, l) => a + l.quantity, 0);
            await tx.product.update({ where: { id: pid }, data: { salesCount: { increment: qty } } });
            await syncProductDerived(tx, pid);
          }

          if (isCod) await clearCart(tx, cart.id!);
          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 20_000 },
      );

      if (isCod) void sendOrderEmail(order.id);
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        payment: isCod ? { kind: "none" } : await startPayment(order.id),
      };
    } catch (err) {
      if (err instanceof OutOfStockError) {
        throw new CheckoutError(`Sorry, ${err.sku} just went out of stock. Please review your cart.`);
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = String(err.meta?.target ?? "");
        if (target.includes("checkoutToken")) return placeOrder(input, userId);
        if (target.includes("orderNumber")) continue;
      }
      throw err;
    }
  }
  throw new CheckoutError("Could not create order, please try again");
}

async function clearCart(tx: Prisma.TransactionClient, cartId: string) {
  await tx.cartItem.deleteMany({ where: { cartId } });
  await tx.cart.update({ where: { id: cartId }, data: { couponCode: null } });
}

/** Creates (or reuses) a provider payment order for an order awaiting payment. */
export async function startPayment(orderId: string): Promise<PaymentInit> {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.status !== "PENDING_PAYMENT") throw new CheckoutError("This order is not awaiting payment");
  if (Date.now() - order.placedAt.getTime() > PAYMENT_PENDING_MINUTES * 60_000) {
    await expireStalePendingOrders();
    throw new CheckoutError("This payment session has expired. Please place the order again from your cart.");
  }
  const open = await prisma.payment.findFirst({
    where: { orderId, status: "CREATED", provider: order.paymentMethod, amount: order.total },
    orderBy: { createdAt: "desc" },
  });
  if (order.paymentMethod === "RAZORPAY") {
    const cfg = razorpayConfig();
    if (!cfg) throw new CheckoutError("Online payment is not configured");
    if (open?.providerOrderId) return { kind: "razorpay", keyId: cfg.keyId, providerOrderId: open.providerOrderId, amount: order.total };
    const rp = await createRazorpayOrder({ amount: order.total, receipt: order.orderNumber, notes: { orderNumber: order.orderNumber } });
    await prisma.payment.create({ data: { orderId, provider: "RAZORPAY", providerOrderId: rp.id, amount: order.total } });
    return { kind: "razorpay", keyId: cfg.keyId, providerOrderId: rp.id, amount: order.total };
  }
  if (order.paymentMethod === "TEST_SIMULATOR") {
    if (!paymentSimulatorEnabled()) throw new CheckoutError("Test payments are disabled");
    if (open?.providerOrderId) return { kind: "simulator", providerOrderId: open.providerOrderId, amount: order.total };
    const providerOrderId = `sim_order_${randomToken(12)}`;
    await prisma.payment.create({ data: { orderId, provider: "TEST_SIMULATOR", providerOrderId, amount: order.total } });
    return { kind: "simulator", providerOrderId, amount: order.total };
  }
  return { kind: "none" };
}

/**
 * Marks a provider payment as captured. Safe to call multiple times (browser callback + webhook + retries):
 * only the first call changes state.
 */
export async function recordPaymentCaptured(input: {
  providerOrderId: string;
  providerPaymentId: string;
  amount: number;
  method?: string | null;
}): Promise<{ orderNumber: string; alreadyProcessed: boolean }> {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { providerOrderId: input.providerOrderId }, include: { order: true } });
    if (!payment) throw new Error(`Unknown payment order ${input.providerOrderId}`);
    if (payment.status === "CAPTURED") return { orderNumber: payment.order.orderNumber, alreadyProcessed: true, orderId: payment.orderId };
    if (input.amount !== payment.amount) {
      await tx.orderEvent.create({
        data: { orderId: payment.orderId, type: "PAYMENT", message: `Amount mismatch: expected ${payment.amount}, received ${input.amount}`, isInternal: true },
      });
      throw new Error("Payment amount mismatch");
    }
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "CAPTURED" } },
      data: { status: "CAPTURED", providerPaymentId: input.providerPaymentId, method: input.method ?? null, errorCode: null, errorReason: null },
    });
    if (claimed.count === 0) return { orderNumber: payment.order.orderNumber, alreadyProcessed: true, orderId: payment.orderId };

    const order = payment.order;
    let message = `Payment of ${formatINR(input.amount)} received`;
    if (order.status === "PENDING_PAYMENT") {
      // stock is still reserved
    } else if (order.status === "PAYMENT_FAILED" || order.status === "CANCELLED") {
      // Late capture after the reservation lapsed: try to re-reserve stock, otherwise flag for refund.
      const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
      try {
        await tx.$executeRaw`SAVEPOINT rereserve`;
        await reserveStock(tx, items.filter((i) => i.variantId).map((i) => ({ variantId: i.variantId!, sku: i.sku, quantity: i.quantity })), order.orderNumber);
        await tx.order.update({ where: { id: order.id }, data: { inventoryReleased: false } });
        message += " after the payment window; stock re-reserved";
      } catch {
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT rereserve`;
        await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "REFUND_PENDING" } });
        await tx.refund.create({ data: { orderId: order.id, paymentId: payment.id, amount: input.amount, reason: "Paid after reservation expired; stock unavailable" } });
        await tx.orderEvent.create({ data: { orderId: order.id, type: "PAYMENT", message: `${message} after expiry, but stock is unavailable — refund required`, isInternal: true } });
        return { orderNumber: order.orderNumber, alreadyProcessed: false, orderId: order.id };
      }
    } else {
      await tx.orderEvent.create({ data: { orderId: order.id, type: "PAYMENT", message: `Duplicate payment captured (${input.providerPaymentId}) — review for refund`, isInternal: true } });
      return { orderNumber: order.orderNumber, alreadyProcessed: false, orderId: order.id };
    }
    await tx.order.update({ where: { id: order.id }, data: { status: "CONFIRMED", paymentStatus: "PAID", cancelledAt: null } });
    await tx.orderEvent.create({
      data: { orderId: order.id, type: "PAYMENT", fromStatus: order.status, toStatus: "CONFIRMED", message },
    });
    if (order.sourceCartId) {
      const cart = await tx.cart.findUnique({ where: { id: order.sourceCartId } });
      if (cart) await clearCart(tx, cart.id);
    }
    return { orderNumber: order.orderNumber, alreadyProcessed: false, orderId: order.id };
  });
  if (!result.alreadyProcessed) void sendOrderEmail(result.orderId);
  return { orderNumber: result.orderNumber, alreadyProcessed: result.alreadyProcessed };
}

export async function recordPaymentFailed(input: { providerOrderId: string; providerPaymentId?: string | null; code?: string | null; reason?: string | null }) {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { providerOrderId: input.providerOrderId }, include: { order: true } });
    if (!payment || payment.status === "CAPTURED") return;
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", errorCode: input.code?.slice(0, 60) ?? null, errorReason: input.reason?.slice(0, 300) ?? null },
    });
    if (payment.order.status === "PENDING_PAYMENT") {
      await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: "FAILED" } });
      await tx.orderEvent.create({
        data: { orderId: payment.orderId, type: "PAYMENT", message: `Payment attempt failed${input.reason ? `: ${input.reason.slice(0, 120)}` : ""}` },
      });
    }
  });
}

/** Releases stock held by unpaid online orders past the payment window. */
export async function expireStalePendingOrders(): Promise<number> {
  const cutoff = new Date(Date.now() - PAYMENT_PENDING_MINUTES * 60_000);
  const stale = await prisma.order.findMany({ where: { status: "PENDING_PAYMENT", placedAt: { lt: cutoff } }, select: { id: true } });
  for (const { id } of stale) {
    await prisma.$transaction(async (tx) => {
      const moved = await tx.order.updateMany({ where: { id, status: "PENDING_PAYMENT" }, data: { status: "PAYMENT_FAILED", paymentStatus: "FAILED" } });
      if (moved.count === 0) return;
      await releaseOrderStock(tx, id);
      await tx.orderEvent.create({
        data: { orderId: id, type: "STATUS_CHANGE", fromStatus: "PENDING_PAYMENT", toStatus: "PAYMENT_FAILED", message: "Payment window expired; reserved stock released" },
      });
    });
  }
  return stale.length;
}

/** Administrative or customer-initiated status changes with validation and side effects. */
export async function changeOrderStatus(orderId: string, to: OrderStatus, actor: { id: string | null; admin: boolean }, note?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: true } });
    const allowed = actor.admin ? ADMIN_TRANSITIONS[order.status] : order.status === "CONFIRMED" ? (["CANCELLED"] as OrderStatus[]) : [];
    if (!allowed.includes(to) || !canTransition(order.status, to)) {
      throw new CheckoutError(`Cannot change order from "${ORDER_STATUS_LABEL[order.status]}" to "${ORDER_STATUS_LABEL[to]}"`);
    }
    const moved = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: to } });
    if (moved.count === 0) throw new CheckoutError("The order was updated by someone else. Please reload.");
    const data: Prisma.OrderUpdateInput = {};
    if (to === "CANCELLED") {
      data.cancelledAt = new Date();
      await releaseOrderStock(tx, orderId);
      const captured = order.payments.find((p) => p.status === "CAPTURED");
      if (captured) {
        data.paymentStatus = "REFUND_PENDING";
        await tx.refund.create({ data: { orderId, paymentId: captured.id, amount: captured.amount, reason: note || "Order cancelled" } });
      }
    }
    if (to === "SHIPPED") {
      await tx.shipment.updateMany({ where: { orderId, shippedAt: null }, data: { shippedAt: new Date(), status: "IN_TRANSIT" } });
    }
    if (to === "DELIVERED") {
      await tx.shipment.updateMany({ where: { orderId }, data: { deliveredAt: new Date(), status: "DELIVERED" } });
      if (order.paymentMethod === "COD") data.paymentStatus = "PAID";
    }
    if (Object.keys(data).length) await tx.order.update({ where: { id: orderId }, data });
    await tx.orderEvent.create({
      data: {
        orderId,
        type: "STATUS_CHANGE",
        fromStatus: order.status,
        toStatus: to,
        message: note ? `${ORDER_STATUS_LABEL[to]} — ${note}` : ORDER_STATUS_LABEL[to],
        actorId: actor.id,
      },
    });
    return { from: order.status, to };
  });
}

export async function sendOrderEmail(orderId: string) {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return;
    const store = await getSetting("store");
    const lines = order.items.map((i) => `• ${i.productName} (${i.variantName}) × ${i.quantity} — ${formatINR(i.lineTotal)}`).join("\n");
    await sendEmail({
      to: order.email,
      subject: `${store.name}: order ${order.orderNumber} confirmed`,
      text: `Hi ${order.customerName},\n\nThank you for your order ${order.orderNumber}.\n\n${lines}\n\nTotal: ${formatINR(order.total)}\n\nTrack your order: ${siteUrl()}/track-order?order=${order.orderNumber}\n\n${store.name}`,
    });
  } catch (err) {
    console.error("[email] order email failed", (err as Error).message);
  }
}
