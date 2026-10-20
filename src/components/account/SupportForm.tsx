"use client";

import { useActionState } from "react";
import { submitSupportRequest, type FormState } from "@/app/actions/engagement";
import { FormMessage, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function SupportForm({ type, defaults }: { type: "SUPPORT" | "CONSULTATION" | "ORDER_ISSUE"; defaults?: { name?: string; email?: string; phone?: string } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitSupportRequest, {});
  const fe = state.fieldErrors ?? {};
  if (state.ok) return <FormMessage success={state.message} />;
  const consult = type === "CONSULTATION";
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2" noValidate>
      <input type="hidden" name="type" value={type} />
      <Input name="name" label="Name" defaultValue={defaults?.name} error={fe.name} required />
      <Input name="email" type="email" label="Email" defaultValue={defaults?.email} error={fe.email} required />
      <Input name="phone" type="tel" label="Mobile (optional)" defaultValue={defaults?.phone} error={fe.phone} />
      {consult ? (
        <Select name="preferredMode" label="Consultation type" options={[{ value: "Video call", label: "Video call" }, { value: "In store", label: "In-store visit" }, { value: "Phone call", label: "Phone call" }]} />
      ) : (
        <Input name="orderNumber" label="Order number (if any)" />
      )}
      {consult && <Input name="preferredDate" type="date" label="Preferred date" error={fe.preferredDate} min={new Date().toISOString().slice(0, 10)} />}
      <Input name="subject" label={consult ? "What are you looking for?" : "Subject"} defaultValue={consult ? "Bridal / special occasion consultation" : ""} error={fe.subject} required className={consult ? "" : "sm:col-span-2"} />
      <Textarea name="message" label="Message" error={fe.message} required className="sm:col-span-2" placeholder={consult ? "Tell us about the occasion, budget and styles you like" : "How can we help?"} />
      <div className="space-y-3 sm:col-span-2">
        <FormMessage error={state.error} />
        <Button loading={pending}>{consult ? "Request consultation" : "Send message"}</Button>
      </div>
    </form>
  );
}
