import Link from "next/link";
import type { ProductCard as Card } from "@/lib/catalog/queries";
import { Badge, Price, Stars } from "@/components/ui/misc";
import { ProductImage } from "@/components/ui/ProductImage";
import { WishlistButton } from "./WishlistButton";
import { cn } from "@/lib/cn";

export function ProductCard({ product: p, priority, className }: { product: Card; priority?: boolean; className?: string }) {
  return (
    <article className={cn("group relative flex flex-col", className)} data-testid="product-card">
      <Link href={`/products/${p.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-cream" aria-label={p.name}>
        {p.image ? (
          <>
            <ProductImage src={p.image.url} alt={p.image.alt} fill priority={priority} sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 50vw" className={cn("object-cover transition-all duration-700 group-hover:scale-[1.03]", p.hoverImage && "group-hover:opacity-0")} />
            {p.hoverImage && <ProductImage src={p.hoverImage.url} alt="" fill sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 50vw" className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100" />}
          </>
        ) : null}
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1">
          {!p.inStock && <Badge tone="dark">Sold out</Badge>}
          {p.inStock && p.discountPct > 0 && <Badge tone="wine">{p.discountPct}% off</Badge>}
          {p.inStock && p.isNew && <Badge tone="neutral" className="bg-white/90">New</Badge>}
          {p.inStock && !p.isNew && p.isBestSeller && <Badge tone="gold">Best seller</Badge>}
        </div>
      </Link>
      <WishlistButton productId={p.id} name={p.name} className="absolute right-2 top-2 size-9 rounded-full bg-white/85 backdrop-blur hover:bg-white" />
      <div className="flex flex-1 flex-col pt-3">
        <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted">{p.metal}</p>
        <h3 className="mt-1 line-clamp-2 font-display text-[1.15rem] leading-snug">
          <Link href={`/products/${p.slug}`} className="hover:text-gold">{p.name}</Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-1 pt-2">
          <Price price={p.price} compareAt={p.compareAtPrice} size="sm" />
          {p.ratingCount > 0 && <Stars value={p.rating} count={p.ratingCount} />}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, className }: { products: Card[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4", className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
