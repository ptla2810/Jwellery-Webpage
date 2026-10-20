"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ShoppingBag, X } from "lucide-react";
import type { ProductCard } from "@/lib/catalog/queries";
import { moveWishlistToCartAction } from "@/app/actions/wishlist";
import { useStore } from "@/components/providers/StoreProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ProductImage } from "@/components/ui/ProductImage";
import { Price } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";

export function WishlistGrid({ items }: { items: (ProductCard & { available: boolean })[] }) {
  const { setCart, setWishlist, toggleWishlist, openDrawer } = useStore();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4" data-testid="wishlist-grid">
      {items.map((p) => (
        <li key={p.id} className="relative flex flex-col">
          <Link href={`/products/${p.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-cream">
            {p.image && <ProductImage src={p.image.url} alt={p.image.alt} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />}
            {!p.available && <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-2 text-center text-xs uppercase tracking-[0.14em] text-ivory">Currently unavailable</span>}
          </Link>
          <button onClick={() => toggleWishlist(p.id)} aria-label={`Remove ${p.name} from wishlist`} className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-white/90 hover:bg-white"><X className="size-4" /></button>
          <p className="mt-3 text-[0.68rem] uppercase tracking-[0.14em] text-muted">{p.metal}</p>
          <Link href={`/products/${p.slug}`} className="font-display text-lg leading-snug hover:text-gold">{p.name}</Link>
          <Price price={p.price} compareAt={p.compareAtPrice} size="sm" className="mt-1" />
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={!p.available || pending}
            onClick={() =>
              start(async () => {
                const r = await moveWishlistToCartAction(p.id);
                if (r.ok) {
                  setCart(r.cart);
                  setWishlist(r.ids);
                  toast("Moved to your bag");
                  openDrawer();
                } else toast(r.error, "error");
              })
            }
          >
            <ShoppingBag className="size-3.5" /> Move to bag
          </Button>
        </li>
      ))}
    </ul>
  );
}
