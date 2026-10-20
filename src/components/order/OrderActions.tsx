"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelOrderAction, requestReturnAction } from "@/app/actions/orders";
import { retryPaymentAction, simulatePaymentAction } from "@/app/actions/checkout";
import type { FormState } from "@/app/actions/engagement";
import { Button } from "@/components/ui/Button";
import { FormMessage, Select, Textarea } from "@/components/ui/Field";

export function CancelOrderButton({ orderNumber }: { orderNumber: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>({});
  const router = useRouter();
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        loading={pending}
        onClick={() => {
          if (!confirm("Cancel this order? This cannot be undone.")) return;
          start(async () => {
            setState(await cancelOrderAction(orderNumber));
            router.refresh();
          });
        }}
      >
        Cancel order
      </Button>
      <FormMessage error={state.error} success={state.message} />
    </div>
  );
}

export function RetryPayment({ orderNumber, simulator }: { orderNumber: string; simulator: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const pay = () =>
    start(async () => {
      const r = await retryPaymentAction(orderNumber);
      if (!r.ok) return setMsg(r.error);
      if (r.payment.kind === "simulator") {
        const s = await simulatePaymentAction({ orderNumber, providerOrderId: r.payment.providerOrderId, outcome: "success" });
        if (!s.ok) setMsg(s.error ?? "Payment failed");
        router.refresh();
        return;
      }
      if (r.payment.kind === "razorpay") {
        router.push(`/checkout/pay/${orderNumber}`);
      }
    });
  return (
    <div className="space-y-2">
      <Button onClick={pay} loading={pending}>{simulator ? "Complete test payment" : "Retry payment"}</Button>
      <FormMessage error={msg} />
    </div>
  );
}

export function ReturnRequestForm({ orderNumber, items }: { orderNumber: string; items: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(requestReturnAction, {});
  const [open, setOpen] = useState(false);
  if (state.ok) return <FormMessage success={state.message} />;
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Request return or exchange</Button>;
  return (
    <form action={action} className="space-y-4 border border-line bg-white p-5">
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <Select name="orderItemId" label="Item" options={items.map((i) => ({ value: i.id, label: i.name }))} required />
      <Select name="type" label="Request" options={[{ value: "RETURN", label: "Return for refund" }, { value: "EXCHANGE", label: "Exchange (size or design)" }]} required />
      <Select name="reason" label="Reason" placeholder="Choose a reason" required options={["Size doesn't fit", "Not as expected", "Received damaged", "Changed my mind", "Other"].map((r) => ({ value: r, label: r }))} />
      <Textarea name="details" label="Details (optional)" maxLength={1000} />
      <FormMessage error={state.error} />
      <div className="flex gap-2">
        <Button loading={pending} size="sm">Submit request</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
