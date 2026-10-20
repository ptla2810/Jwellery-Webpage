"use client";

import { useState, useTransition } from "react";
import { MapPin, Truck } from "lucide-react";
import { checkDeliveryAction } from "@/app/actions/engagement";

export function DeliveryCheck() {
  const [code, setCode] = useState("");
  const [res, setRes] = useState<Awaited<ReturnType<typeof checkDeliveryAction>> | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="border border-line bg-white p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]"><Truck className="size-4 text-gold" /> Delivery &amp; availability</p>
      <form
        className="mt-3 flex border-b border-line focus-within:border-gold"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => setRes(await checkDeliveryAction(code)));
        }}
      >
        <MapPin className="my-auto size-4 text-muted" aria-hidden />
        <label htmlFor="pdp-pincode" className="sr-only">PIN code</label>
        <input id="pdp-pincode" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="Enter PIN code" className="h-10 flex-1 bg-transparent px-2 text-sm focus:outline-none focus-visible:outline-none" />
        <button disabled={pending || code.length !== 6} className="text-xs font-semibold uppercase tracking-[0.14em] text-gold disabled:opacity-40">{pending ? "…" : "Check"}</button>
      </form>
      {res && (
        <div role="status" className="mt-3 space-y-0.5 text-sm" data-testid="delivery-result">
          <p className={res.ok ? "text-success" : "text-danger"}>{res.message}</p>
          {res.ok && res.express && <p className="text-muted">{res.express}</p>}
          {res.ok && <p className="text-muted">{res.cod ? "Cash on delivery available" : "Prepaid orders only"}</p>}
        </div>
      )}
    </div>
  );
}
