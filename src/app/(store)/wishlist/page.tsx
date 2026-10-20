import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { wishlistItems } from "@/lib/wishlist";
import { getCurrentUser } from "@/lib/auth/session";
import { WishlistGrid } from "@/components/account/WishlistGrid";
import { EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/Button";
import Link from "next/link";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const [items, user] = await Promise.all([wishlistItems(), getCurrentUser()]);
  return (
    <div className="container-x py-10">
      <h1 className="text-4xl">Wishlist</h1>
      {!user && items.length > 0 && <p className="mt-2 text-sm text-muted"><Link href="/login?next=/wishlist" className="text-gold underline">Sign in</Link> to save your wishlist across devices.</p>}
      <div className="mt-8">
        {items.length ? <WishlistGrid items={items} /> : <EmptyState icon={<Heart className="size-10" strokeWidth={1.2} />} title="Your wishlist is empty" body="Tap the heart on any piece to save it here." action={<ButtonLink href="/collections/best-sellers" variant="outline">Explore best sellers</ButtonLink>} />}
      </div>
    </div>
  );
}
