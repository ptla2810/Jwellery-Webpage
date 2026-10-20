"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ShoppingBag, Tag, X } from "lucide-react";
import type { CartView } from "@/lib/cart";
import { applyCouponAction, removeCouponAction } from "@/app/actions/cart";
import { useStore } from "@/components/providers/StoreProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ButtonLink, Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/misc";
import { CartLines } from "./CartLines";
import { OrderSummary } from "./OrderSummary";

export function CartPageClient({ initial }: { initial: CartView }) {
  const { cart: live, setCart } = useStore();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => setCart(initial), [initial, setCart]);
  const cart = live ?? initial;

  if (cart.lines.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-10" strokeWidth={1.2} />}
        title="Your bag is empty"
        body="Discover pieces you'll love — start with our best sellers or new arrivals."
        action={<div className="flex gap-3"><ButtonLink href="/collections/best-sellers">Best sellers</ButtonLink><ButtonLink href="/collections/new-arrivals" variant="outline">New arrivals</ButtonLink></div>}
      />
    );
  }
  const apply = () =>
    start(async () => {
      const res = await applyCouponAction(code);
      if (res.cart) setCart(res.cart);
      if (res.ok) {
        setCouponError(null);
        setCode("");
        toast("Coupon applied");
      } else setCouponError(res.error);
    });
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div>
        {cart.hasIssues && (
          <p role="alert" className="mb-4 border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            Some items are unavailable or exceed available stock. Please update them before checkout.
          </p>
        )}
        <CartLines cart={cart} />
      </div>
      <aside className="h-fit space-y-6 border border-line bg-white p-6 lg:sticky lg:top-28" aria-label="Order summary">
        <h2 className="font-display text-2xl">Order summary</h2>
        <div>
          {cart.couponInput && !cart.quote.couponError ? (
            <div className="flex items-center justify-between rounded-[var(--radius-sm)] bg-success/5 px-3 py-2 text-sm text-success">
              <span className="flex items-center gap-2"><Tag className="size-4" /> {cart.couponInput} applied</span>
              <button
                aria-label="Remove coupon"
                onClick={() => start(async () => { const r = await removeCouponAction(); if (r.cart) setCart(r.cart); })}
                className="text-muted hover:text-danger"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); apply(); }} className="space-y-1">
              <label htmlFor="coupon" className="text-xs font-semibold uppercase tracking-[0.12em]">Coupon code</label>
              <div className="flex gap-2">
                <input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. WELCOME10" aria-invalid={!!couponError || undefined} className="h-11 flex-1 border border-line px-3 text-sm uppercase focus:border-gold focus:outline-none" />
                <Button type="submit" variant="outline" loading={pending} disabled={!code}>Apply</Button>
              </div>
              {(couponError || cart.quote.couponError) && <p role="alert" className="text-xs text-danger">{couponError ?? cart.quote.couponError}</p>}
            </form>
          )}
        </div>
        <OrderSummary quote={cart.quote} />
        {cart.hasIssues ? (
          <Button size="lg" className="w-full" disabled>Resolve cart issues to continue</Button>
        ) : (
          <ButtonLink href="/checkout" size="lg" className="w-full" data-testid="checkout-button">Proceed to checkout</ButtonLink>
        )}
        <p className="text-center text-xs text-muted"><Link href="/pages/shipping-policy" className="underline">Shipping</Link> and <Link href="/pages/returns-and-exchange" className="underline">returns</Link> policies apply.</p>
      </aside>
    </div>
  );
}
