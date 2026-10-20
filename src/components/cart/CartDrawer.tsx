"use client";

import { ShoppingBag } from "lucide-react";
import { useStore } from "@/components/providers/StoreProvider";
import { Sheet } from "@/components/ui/Sheet";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/misc";
import { formatINR } from "@/lib/money";
import { CartLines } from "./CartLines";

export function CartDrawer() {
  const { drawerOpen, closeDrawer, cart } = useStore();
  const empty = cart && cart.lines.length === 0;
  return (
    <Sheet
      open={drawerOpen}
      onClose={closeDrawer}
      title={`Your bag${cart && cart.count ? ` (${cart.count})` : ""}`}
      footer={
        cart && !empty ? (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="font-semibold">{formatINR(cart.quote.subtotal)}</span>
            </div>
            <p className="text-xs text-muted">Shipping, coupons and taxes are calculated at checkout.</p>
            <div className="grid grid-cols-2 gap-2">
              <ButtonLink href="/cart" variant="outline" onClick={closeDrawer}>View bag</ButtonLink>
              <ButtonLink href="/checkout" onClick={closeDrawer} aria-disabled={cart.hasIssues}>Checkout</ButtonLink>
            </div>
          </div>
        ) : null
      }
    >
      <div className="px-5">
        {!cart ? (
          <div className="space-y-4 py-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : empty ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <ShoppingBag className="size-10 text-gold-500" strokeWidth={1.2} />
            <p className="font-display text-2xl">Your bag is empty</p>
            <ButtonLink href="/collections/best-sellers" onClick={closeDrawer} variant="outline">Discover best sellers</ButtonLink>
          </div>
        ) : (
          <CartLines cart={cart} compact onNavigate={closeDrawer} />
        )}
      </div>
    </Sheet>
  );
}
