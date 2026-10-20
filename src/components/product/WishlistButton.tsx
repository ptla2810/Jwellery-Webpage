"use client";

import { Heart } from "lucide-react";
import { useStore } from "@/components/providers/StoreProvider";
import { cn } from "@/lib/cn";

export function WishlistButton({ productId, name, className, withLabel }: { productId: string; name: string; className?: string; withLabel?: boolean }) {
  const { wishlist, toggleWishlist } = useStore();
  const saved = wishlist.has(productId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(productId);
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      className={cn("inline-flex items-center justify-center gap-2 transition-colors", className)}
    >
      <Heart className={cn("size-[1.1rem] transition-all", saved ? "fill-wine text-wine" : "text-charcoal")} strokeWidth={1.6} />
      {withLabel && <span>{saved ? "Saved" : "Wishlist"}</span>}
    </button>
  );
}
