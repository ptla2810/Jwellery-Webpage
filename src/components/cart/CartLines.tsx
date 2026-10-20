"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Minus, Plus, Trash2, AlertTriangle } from "lucide-react";
import { removeCartItemAction, updateCartItemAction } from "@/app/actions/cart";
import type { CartView } from "@/lib/cart";
import { formatINR } from "@/lib/money";
import { useStore } from "@/components/providers/StoreProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ProductImage } from "@/components/ui/ProductImage";
import { cn } from "@/lib/cn";

export function CartLines({ cart, compact = false, onNavigate }: { cart: CartView; compact?: boolean; onNavigate?: () => void }) {
  const { setCart } = useStore();
  const toast = useToast();
  const [pending, start] = useTransition();

  const update = (fn: () => ReturnType<typeof updateCartItemAction>) =>
    start(async () => {
      const res = await fn();
      if (res.cart) setCart(res.cart);
      if (!res.ok) toast(res.error, "error");
    });

  return (
    <ul className={cn("divide-y divide-line", pending && "opacity-70")} aria-busy={pending}>
      {cart.lines.map((l) => (
        <li key={l.id} className="flex gap-4 py-5" data-testid="cart-line">
          <Link href={`/products/${l.slug}`} onClick={onNavigate} className={cn("relative shrink-0 overflow-hidden bg-cream", compact ? "h-24 w-20" : "h-32 w-26")}>
            {l.image && <ProductImage src={l.image.url} alt={l.image.alt} fill sizes="120px" className="object-cover" />}
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/products/${l.slug}`} onClick={onNavigate} className="line-clamp-2 font-display text-lg leading-snug hover:text-gold">
                  {l.name}
                </Link>
                <p className="mt-0.5 text-xs text-muted">
                  {l.metal}
                  {l.variantName !== "Standard" && ` · ${l.variantName}`}
                </p>
                <p className="text-[0.7rem] text-muted/80">SKU {l.sku}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold" data-testid="line-total">{formatINR(l.unitPrice * l.quantity)}</p>
            </div>
            {l.issue && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-danger">
                <AlertTriangle className="size-3.5" /> {l.issue}
              </p>
            )}
            <div className="mt-auto flex items-center justify-between pt-3">
              <div className="flex items-center border border-line bg-white">
                <button
                  type="button"
                  className="p-2 hover:bg-cream disabled:opacity-40"
                  aria-label={`Decrease quantity of ${l.name}`}
                  disabled={pending || l.quantity <= 1}
                  onClick={() => update(() => updateCartItemAction(l.id, l.quantity - 1))}
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-8 text-center text-sm" aria-label="Quantity" data-testid="line-qty">{l.quantity}</span>
                <button
                  type="button"
                  className="p-2 hover:bg-cream disabled:opacity-40"
                  aria-label={`Increase quantity of ${l.name}`}
                  disabled={pending || l.quantity >= Math.min(5, l.stock)}
                  onClick={() => update(() => updateCartItemAction(l.id, l.quantity + 1))}
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => update(() => removeCartItemAction(l.id))}
                disabled={pending}
                className="flex items-center gap-1 text-xs text-muted hover:text-danger"
              >
                <Trash2 className="size-3.5" /> Remove
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
