"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trackOrderAction } from "@/app/actions/orders";
import type { FormState } from "@/app/actions/engagement";
import { Input, FormMessage } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function TrackForm({ initialOrder }: { initialOrder?: string }) {
  const [state, action, pending] = useActionState<FormState & { orderNumber?: string }, FormData>(trackOrderAction, {});
  const router = useRouter();
  useEffect(() => {
    if (state.ok && state.orderNumber) router.push(`/order/${state.orderNumber}`);
  }, [state, router]);
  return (
    <form action={action} className="space-y-5" noValidate>
      <Input name="orderNumber" label="Order number" defaultValue={initialOrder} placeholder="AUR..." required />
      <Input name="email" type="email" label="Email used for the order" required />
      <FormMessage error={state.error} />
      <Button size="lg" className="w-full" loading={pending}>Track order</Button>
    </form>
  );
}
