"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { retryPaymentAction } from "@/app/actions/checkout";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { formatINR } from "@/lib/money";
import { openRazorpayCheckout } from "./razorpay";

export function PayExisting({ orderNumber, amount, storeName, prefill }: { orderNumber: string; amount: number; storeName: string; prefill: { name: string; email: string; contact: string } }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pay = () =>
    start(async () => {
      const r = await retryPaymentAction(orderNumber);
      if (!r.ok) return setMsg(r.error);
      if (r.payment.kind !== "razorpay") return setMsg("Online payment is not available for this order");
      await openRazorpayCheckout({ ...r.payment, orderNumber, storeName, prefill, onVerified: () => router.push(`/order/${orderNumber}?placed=1`), onMessage: setMsg });
    });
  return (
    <div className="space-y-4">
      <Button size="lg" onClick={pay} loading={pending}>Pay {formatINR(amount)}</Button>
      <FormMessage error={msg} />
    </div>
  );
}
