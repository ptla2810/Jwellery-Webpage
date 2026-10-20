"use client";

import { reportPaymentFailureAction, verifyRazorpayPaymentAction } from "@/app/actions/checkout";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: { error: { code: string; description: string } }) => void) => void };
  }
}

function loadScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/** Opens Razorpay Checkout; success is only reported after server-side signature + status verification. */
export async function openRazorpayCheckout(opts: {
  keyId: string;
  providerOrderId: string;
  amount: number;
  orderNumber: string;
  storeName: string;
  prefill?: { name?: string; email?: string; contact?: string };
  onVerified: () => void;
  onMessage: (msg: string) => void;
}) {
  if (!(await loadScript()) || !window.Razorpay) {
    opts.onMessage("Could not load the payment window. Check your connection and try again.");
    return;
  }
  const rzp = new window.Razorpay({
    key: opts.keyId,
    amount: opts.amount,
    currency: "INR",
    name: opts.storeName,
    description: `Order ${opts.orderNumber}`,
    order_id: opts.providerOrderId,
    prefill: opts.prefill,
    theme: { color: "#1f1c19" },
    handler: async (resp: Record<string, string>) => {
      const r = await verifyRazorpayPaymentAction({ orderNumber: opts.orderNumber, ...resp });
      if (r.ok) opts.onVerified();
      else opts.onMessage(r.error ?? "Payment could not be verified");
    },
    modal: { ondismiss: () => opts.onMessage("Payment was cancelled. Your order is reserved for 30 minutes — you can retry.") },
  });
  rzp.on("payment.failed", (r) => {
    opts.onMessage(`Payment failed: ${r.error.description}. You can retry.`);
    reportPaymentFailureAction({ orderNumber: opts.orderNumber, providerOrderId: opts.providerOrderId, code: r.error.code, reason: r.error.description });
  });
  rzp.open();
}
