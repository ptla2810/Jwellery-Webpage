"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartView } from "@/lib/cart";
import { estimateDelivery, formatDateRange } from "@/lib/delivery";
import { getSetting } from "@/lib/settings";
import { rateLimit } from "@/lib/rate-limit";
import { razorpayConfig, paymentSimulatorEnabled, isProduction } from "@/lib/env";
import { randomToken } from "@/lib/auth/tokens";
import {
  availablePaymentMethods,
  checkoutSchema,
  CheckoutError,
  placeOrder,
  recordPaymentCaptured,
  recordPaymentFailed,
  startPayment,
  type PaymentInit,
} from "@/lib/orders/service";
import { findAccessibleOrder, grantOrderAccess } from "@/lib/orders/access";
import { fetchRazorpayPayment, verifyCheckoutSignature } from "@/lib/payments/razorpay";
import type { PriceQuote } from "@/lib/pricing";

export type QuoteResult =
  | {
      ok: true;
      quote: PriceQuote;
      delivery: { standard: string; express: string | null; codAvailable: boolean };
      methods: Awaited<ReturnType<typeof availablePaymentMethods>>;
      hasIssues: boolean;
    }
  | { ok: false; error: string };

export async function checkoutQuoteAction(input: { postalCode: string; deliveryOption: "standard" | "express"; paymentMethod?: "RAZORPAY" | "COD" | "TEST_SIMULATOR" }): Promise<QuoteResult> {
  const shipping = await getSetting("shipping");
  const est = estimateDelivery(String(input.postalCode ?? ""), shipping);
  if (!est.serviceable) return { ok: false, error: est.reason };
  const delivery = input.deliveryOption === "express" && est.express ? "express" : "standard";
  try {
    const cart = await getCartView({ deliveryOption: delivery, paymentMethod: input.paymentMethod });
    if (!cart.lines.length) return { ok: false, error: "Your cart is empty" };
    return {
      ok: true,
      quote: cart.quote,
      hasIssues: cart.hasIssues,
      delivery: {
        standard: formatDateRange(est.standard.from, est.standard.to),
        express: est.express ? formatDateRange(est.express.from, est.express.to) : null,
        codAvailable: est.codAvailable,
      },
      methods: await availablePaymentMethods(cart.quote.total),
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export type PlaceOrderResult = { ok: true; orderNumber: string; payment: PaymentInit; prefill: { name: string; email: string; contact: string } } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function placeOrderAction(raw: unknown, saveAddress: boolean): Promise<PlaceOrderResult> {
  if (!(await rateLimit("place-order", 10, 600))) return { ok: false, error: "Too many attempts. Please wait a few minutes." };
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[i.path.join(".")] ??= i.message;
    return { ok: false, error: "Please check your details", fieldErrors: fe };
  }
  const user = await getCurrentUser();
  if (user && process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.emailVerified) {
    return { ok: false, error: "Please verify your email address before placing an order (see My Account)." };
  }
  try {
    const result = await placeOrder(parsed.data, user?.id ?? null);
    await grantOrderAccess(result.orderNumber);
    if (user && saveAddress) {
      const a = parsed.data.address;
      const dup = await prisma.address.findFirst({ where: { userId: user.id, line1: a.line1, postalCode: a.postalCode } });
      if (!dup) {
        const count = await prisma.address.count({ where: { userId: user.id } });
        await prisma.address.create({ data: { ...a, line2: a.line2 || null, landmark: a.landmark || null, userId: user.id, isDefault: count === 0 } });
      }
    }
    return {
      ok: true,
      orderNumber: result.orderNumber,
      payment: result.payment,
      prefill: { name: parsed.data.contact.name, email: parsed.data.contact.email, contact: parsed.data.contact.phone },
    };
  } catch (err) {
    if (err instanceof CheckoutError) return { ok: false, error: err.message };
    console.error("[checkout] place order failed", err);
    return { ok: false, error: "We couldn't place your order. Please try again." };
  }
}

export async function retryPaymentAction(orderNumber: string): Promise<{ ok: true; payment: PaymentInit } | { ok: false; error: string }> {
  const order = await findAccessibleOrder(String(orderNumber));
  if (!order) return { ok: false, error: "Order not found" };
  try {
    return { ok: true, payment: await startPayment(order.id) };
  } catch (err) {
    return { ok: false, error: err instanceof CheckoutError ? err.message : "Could not restart payment" };
  }
}

const rzpSchema = z.object({
  orderNumber: z.string().max(30),
  razorpay_order_id: z.string().max(60),
  razorpay_payment_id: z.string().max(60),
  razorpay_signature: z.string().max(200),
});

/**
 * Called by the browser after Razorpay Checkout succeeds. The signature is verified with our secret and the
 * payment status/amount is re-fetched from Razorpay before the order is marked paid. The webhook performs the
 * same idempotent update, so either path completing first is safe.
 */
export async function verifyRazorpayPaymentAction(raw: unknown): Promise<{ ok: boolean; error?: string; orderNumber?: string }> {
  const cfg = razorpayConfig();
  const parsed = rzpSchema.safeParse(raw);
  if (!cfg || !parsed.success) return { ok: false, error: "Invalid payment response" };
  const d = parsed.data;
  const order = await findAccessibleOrder(d.orderNumber);
  if (!order) return { ok: false, error: "Order not found" };
  const payment = await prisma.payment.findUnique({ where: { providerOrderId: d.razorpay_order_id } });
  if (!payment || payment.orderId !== order.id) return { ok: false, error: "Payment does not match this order" };
  if (!verifyCheckoutSignature(d.razorpay_order_id, d.razorpay_payment_id, d.razorpay_signature, cfg.keySecret)) {
    await recordPaymentFailed({ providerOrderId: d.razorpay_order_id, providerPaymentId: d.razorpay_payment_id, code: "SIGNATURE_MISMATCH", reason: "Signature verification failed" });
    return { ok: false, error: "Payment verification failed. If money was debited, it will be refunded automatically by your bank or contact us." };
  }
  try {
    let rp = await fetchRazorpayPayment(d.razorpay_payment_id);
    if (rp.order_id !== d.razorpay_order_id) return { ok: false, error: "Payment does not match this order" };
    if (rp.status === "authorized") {
      const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(rp.id)}/capture`, {
        method: "POST",
        headers: { Authorization: "Basic " + Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString("base64"), "Content-Type": "application/json" },
        body: JSON.stringify({ amount: rp.amount, currency: "INR" }),
      });
      if (res.ok) rp = await res.json();
    }
    if (rp.status !== "captured") {
      return { ok: false, error: "Your payment is still processing. We'll confirm your order as soon as it completes.", orderNumber: order.orderNumber };
    }
    await recordPaymentCaptured({ providerOrderId: d.razorpay_order_id, providerPaymentId: rp.id, amount: rp.amount, method: rp.method ?? null });
    return { ok: true, orderNumber: order.orderNumber };
  } catch (err) {
    console.error("[razorpay] verification error", (err as Error).message);
    return { ok: false, error: "We could not confirm your payment yet. Please check your order status shortly.", orderNumber: order.orderNumber };
  }
}

export async function reportPaymentFailureAction(input: { orderNumber: string; providerOrderId: string; code?: string; reason?: string }) {
  const order = await findAccessibleOrder(String(input.orderNumber));
  if (!order) return { ok: false };
  const payment = await prisma.payment.findUnique({ where: { providerOrderId: String(input.providerOrderId) } });
  if (!payment || payment.orderId !== order.id) return { ok: false };
  await recordPaymentFailed({ providerOrderId: payment.providerOrderId!, code: input.code?.slice(0, 60), reason: input.reason?.slice(0, 200) });
  return { ok: true };
}

/** Development-only simulated gateway (never available in production). */
export async function simulatePaymentAction(input: { orderNumber: string; providerOrderId: string; outcome: "success" | "failure" }) {
  if (isProduction || !paymentSimulatorEnabled()) return { ok: false, error: "Simulator disabled" };
  const order = await findAccessibleOrder(String(input.orderNumber));
  if (!order) return { ok: false, error: "Order not found" };
  const payment = await prisma.payment.findUnique({ where: { providerOrderId: String(input.providerOrderId) } });
  if (!payment || payment.orderId !== order.id || payment.provider !== "TEST_SIMULATOR") return { ok: false, error: "Payment not found" };
  if (input.outcome === "failure") {
    await recordPaymentFailed({ providerOrderId: payment.providerOrderId!, code: "SIMULATED_FAILURE", reason: "Simulated card decline (test mode)" });
    return { ok: false, error: "Payment failed (simulated). You can retry." };
  }
  await recordPaymentCaptured({ providerOrderId: payment.providerOrderId!, providerPaymentId: `sim_pay_${randomToken(10)}`, amount: payment.amount, method: "test" });
  return { ok: true, orderNumber: order.orderNumber };
}
