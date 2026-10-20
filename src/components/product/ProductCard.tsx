import Link from "next/link";
import type { ProductCard as Card } from "@/lib/catalog/queries";
import { Badge, Price } from "@/components/ui/misc";
import { ProductImage } from "@/components/ui/ProductImage";
import { WishlistButton } from "./WishlistButton";
import { cn } from "@/lib/cn";

export function ProductCard({ product: p, priority, className }: { product: Card; priority?: boolean; className?: string }) {
  return (
    <article className={cn("group relative flex flex-col", className)} data-testid="product-card">
      <Link href={`/products/${p.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-cream" aria-label={p.name}>
        {p.image ? (
          <>
            <ProductImage src={p.image.url} alt={p.image.alt} fill priority={priority} sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 50vw" className={cn("object-cover transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.04]", p.hoverImage && "group-hover:opacity-0")} />
            {p.hoverImage && <ProductImage src={p.hoverImage.url} alt="" fill sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 50vw" className="object-cover opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100" />}
          </>
        ) : null}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1">
          {!p.inStock && <Badge tone="dark">Sold out</Badge>}
          {p.inStock && p.discountPct > 0 && <Badge tone="wine">{p.discountPct}% off</Badge>}
          {p.inStock && p.isNew && <Badge tone="neutral" className="bg-white/90 backdrop-blur">New</Badge>}
          {p.inStock && !p.isNew && p.isBestSeller && <Badge tone="neutral" className="bg-white/90 backdrop-blur">Best seller</Badge>}
        </div>
      </Link>
      <WishlistButton productId={p.id} name={p.name} className="absolute right-2.5 top-2.5 size-9 rounded-full bg-white/80 text-ink backdrop-blur transition-colors hover:bg-white" />
      <div className="flex flex-1 flex-col items-center pt-4 text-center">
        <h3 className="line-clamp-2 font-display text-[1.15rem] leading-snug">
          <Link href={`/products/${p.slug}`} className="transition-colors hover:text-gold">{p.name}</Link>
        </h3>
        <p className="mt-1 text-[0.66rem] uppercase tracking-[0.18em] text-muted">{p.metal}</p>
        <div className="mt-auto pt-2">
          <Price price={p.price} compareAt={p.compareAtPrice} size="sm" className="justify-center" />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, className }: { products: Card[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-12 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4", className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
