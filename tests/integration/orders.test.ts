import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { addItem, CartError, getCartView } from "@/lib/cart";
import { checkoutSchema, CheckoutError, expireStalePendingOrders, placeOrder, recordPaymentCaptured, recordPaymentFailed, startPayment } from "@/lib/orders/service";
import { asGuest, asUser, checkoutInput, setStock, variantBySku } from "../support/helpers";
import { cookieJar } from "../support/setup";

const STUDS = "AUR-ER-001"; // Mira Diamond Studs, single variant
const PENDANT = "AUR-PD-001"; // Dil Diamond Heart Pendant

beforeEach(async () => {
  await setStock(STUDS, 10);
  await setStock(PENDANT, 10);
});

describe("cart & variants", () => {
  it("rejects inactive variants, out-of-stock items and over-quantity", async () => {
    asGuest();
    const ring = await variantBySku("AUR-RG-007-14"); // Vana Emerald Halo Ring, seeded out of stock
    await expect(addItem(ring.id, 1)).rejects.toBeInstanceOf(CartError);
    const studs = await setStock(STUDS, 2);
    await expect(addItem(studs.id, 3)).rejects.toThrow(/Only 2 available/);
    await prisma.productVariant.update({ where: { id: studs.id }, data: { isActive: false } });
    await expect(addItem(studs.id, 1)).rejects.toThrow(/not available/);
    await prisma.productVariant.update({ where: { id: studs.id }, data: { isActive: true } });
  });

  it("computes cart totals on the server from database prices", async () => {
    asGuest();
    const studs = await variantBySku(STUDS);
    const pendant = await variantBySku(PENDANT);
    await addItem(studs.id, 1);
    await addItem(pendant.id, 2);
    const cart = await getCartView();
    expect(cart.count).toBe(3);
    expect(cart.quote.subtotal).toBe(studs.price + pendant.price * 2);
    expect(cart.quote.total).toBe(cart.quote.subtotal + cart.quote.shippingFee);
  });
});

describe("checkout validation", () => {
  it("validates addresses, phone numbers and PIN codes", () => {
    const bad = checkoutSchema.safeParse({ ...checkoutInput(), address: { ...checkoutInput().address, postalCode: "12345", phone: "12345" } });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      const paths = bad.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("address.postalCode");
      expect(paths).toContain("address.phone");
    }
  });

  it("rejects unserviceable PIN codes and empty carts", async () => {
    asGuest();
    await expect(placeOrder(checkoutInput(), null)).rejects.toThrow(/empty/);
    await addItem((await variantBySku(STUDS)).id, 1);
    await expect(placeOrder(checkoutInput({ address: { ...checkoutInput().address, postalCode: "744101" } }), null)).rejects.toThrow(/do not deliver/);
  });

  it("ignores any client-supplied price fields", async () => {
    asGuest();
    const studs = await variantBySku(STUDS);
    await addItem(studs.id, 1);
    const tampered = { ...checkoutInput(), total: 1, price: 1, subtotal: 1 } as unknown;
    const parsed = checkoutSchema.parse(tampered);
    const r = await placeOrder(parsed, null);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: r.orderId } });
    expect(order.subtotal).toBe(studs.price);
    expect(order.total).toBe(studs.price + order.shippingFee);
  });
});

describe("order creation", () => {
  it("creates a consistent COD order: snapshot, stock, movement and cart", async () => {
    asGuest();
    const studs = await variantBySku(PENDANT); // 2 × ₹17,900 stays under the COD limit
    await addItem(studs.id, 2);
    const before = (await variantBySku(PENDANT)).inventory!.quantity;
    const r = await placeOrder(checkoutInput(), null);
    expect(r.status).toBe("CONFIRMED");
    const order = await prisma.order.findUniqueOrThrow({ where: { id: r.orderId }, include: { items: true } });
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({ sku: PENDANT, quantity: 2, unitPrice: studs.price, productName: studs.product.name });
    expect(order.subtotal).toBe(studs.price * 2);
    expect(order.items.reduce((a, i) => a + i.lineTotal, 0) + order.shippingFee + order.codFee).toBe(order.total);
    expect((await variantBySku(PENDANT)).inventory!.quantity).toBe(before - 2);
    expect(await prisma.inventoryMovement.count({ where: { reference: order.orderNumber, reason: "ORDER_PLACED" } })).toBe(1);
    expect((await getCartView()).count).toBe(0);
    // catalogue changes do not alter historical orders
    await prisma.productVariant.update({ where: { id: studs.id }, data: { price: studs.price + 100_00 } });
    const again = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } });
    expect(again.unitPrice).toBe(studs.price);
    await prisma.productVariant.update({ where: { id: studs.id }, data: { price: studs.price } });
  });

  it("is idempotent on the checkout token", async () => {
    asGuest();
    await addItem((await variantBySku(PENDANT)).id, 1);
    const input = checkoutInput({ paymentMethod: "TEST_SIMULATOR" });
    const [a, b] = await Promise.all([placeOrder(input, null), placeOrder(input, null)]);
    expect(a.orderNumber).toBe(b.orderNumber);
    expect(await prisma.order.count({ where: { checkoutToken: input.checkoutToken } })).toBe(1);
  });

  it("never oversells when two customers buy the last item concurrently", async () => {
    await setStock(STUDS, 1);
    const studs = await variantBySku(STUDS);
    asGuest();
    await addItem(studs.id, 1);
    const jarA = new Map(cookieJar);
    asGuest();
    await addItem(studs.id, 1);
    const jarB = new Map(cookieJar);
    const run = async (jar: Map<string, string>) => {
      cookieJar.clear();
      jar.forEach((v, k) => cookieJar.set(k, v));
      const cart = await getCartView(); // capture cart under this identity before awaiting the DB race
      return placeOrder(checkoutInput(), null).then(() => "ok", (e) => (e instanceof CheckoutError ? "rejected" : `error: ${e}`)).finally(() => void cart);
    };
    const results = [await run(jarA), await run(jarB)];
    expect(results.sort()).toEqual(["ok", "rejected"]);
    expect((await variantBySku(STUDS)).inventory!.quantity).toBe(0);
  });
});

describe("payments", () => {
  async function pendingOrder() {
    asGuest();
    await addItem((await variantBySku(PENDANT)).id, 1);
    const r = await placeOrder(checkoutInput({ paymentMethod: "TEST_SIMULATOR" }), null);
    expect(r.status).toBe("PENDING_PAYMENT");
    if (r.payment.kind !== "simulator") throw new Error("expected simulator payment");
    return { ...r, providerOrderId: r.payment.providerOrderId, amount: r.payment.amount };
  }

  it("keeps the order pending and the cart intact when a payment fails", async () => {
    const o = await pendingOrder();
    await recordPaymentFailed({ providerOrderId: o.providerOrderId, code: "BAD_REQUEST_ERROR", reason: "Card declined" });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: o.orderId } });
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.paymentStatus).toBe("FAILED");
    expect((await getCartView()).count).toBe(1);
    // retry reuses/creates a payment and can then succeed
    const retry = await startPayment(o.orderId);
    expect(retry.kind).toBe("simulator");
  });

  it("confirms on success and ignores duplicate notifications", async () => {
    const o = await pendingOrder();
    const capture = () => recordPaymentCaptured({ providerOrderId: o.providerOrderId, providerPaymentId: "pay_dup_1", amount: o.amount });
    const results = await Promise.allSettled([capture(), capture(), capture()]);
    const fulfilled = results.filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<{ alreadyProcessed: boolean }>).value);
    expect(fulfilled.filter((r) => !r.alreadyProcessed)).toHaveLength(1);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: o.orderId }, include: { payments: true, events: true } });
    expect(order.status).toBe("CONFIRMED");
    expect(order.paymentStatus).toBe("PAID");
    expect(order.payments.filter((p) => p.status === "CAPTURED")).toHaveLength(1);
    expect(order.events.filter((e) => e.type === "PAYMENT" && e.message.startsWith("Payment of"))).toHaveLength(1);
    expect(await prisma.order.count({ where: { checkoutToken: order.checkoutToken } })).toBe(1);
    expect((await getCartView()).count).toBe(0);
  });

  it("rejects captures with a mismatched amount", async () => {
    const o = await pendingOrder();
    await expect(recordPaymentCaptured({ providerOrderId: o.providerOrderId, providerPaymentId: "pay_wrong", amount: o.amount - 1 })).rejects.toThrow(/mismatch/);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: o.orderId } })).status).toBe("PENDING_PAYMENT");
  });

  it("releases reserved stock when the payment window expires", async () => {
    const o = await pendingOrder();
    const before = (await variantBySku(PENDANT)).inventory!.quantity;
    await prisma.order.update({ where: { id: o.orderId }, data: { placedAt: new Date(Date.now() - 31 * 60_000) } });
    await expireStalePendingOrders();
    await expireStalePendingOrders(); // second run must not release twice
    const order = await prisma.order.findUniqueOrThrow({ where: { id: o.orderId } });
    expect(order.status).toBe("PAYMENT_FAILED");
    expect((await variantBySku(PENDANT)).inventory!.quantity).toBe(before + 1);
  });

  it("links orders to signed-in customers", async () => {
    const user = await asUser("customer");
    await addItem((await variantBySku(STUDS)).id, 1);
    const r = await placeOrder(checkoutInput(), user.id);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: r.orderId } })).userId).toBe(user.id);
  });
});
