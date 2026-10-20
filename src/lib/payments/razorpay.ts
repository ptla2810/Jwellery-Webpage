import { createHmac } from "node:crypto";
import { razorpayConfig } from "../env";
import { safeEqual } from "../auth/tokens";

const API = "https://api.razorpay.com/v1";

function authHeader() {
  const cfg = razorpayConfig();
  if (!cfg) throw new Error("Razorpay is not configured");
  return "Basic " + Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString("base64");
}

export async function createRazorpayOrder(input: { amount: number; receipt: string; notes?: Record<string, string> }) {
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: input.amount, currency: "INR", receipt: input.receipt.slice(0, 40), notes: input.notes }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[razorpay] order create failed", res.status, body.slice(0, 300));
    throw new Error("Could not start payment. Please try again.");
  }
  const data = (await res.json()) as { id: string; amount: number; status: string };
  return data;
}

export type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method?: string;
  error_code?: string | null;
  error_description?: string | null;
};

export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Razorpay payment lookup failed (${res.status})`);
  return (await res.json()) as RazorpayPayment;
}

/** Checkout signature: HMAC_SHA256(order_id|payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}
