import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { frequentlyBoughtTogether, getProductBySlug, relatedProducts } from "@/lib/catalog/queries";
import { metalSummary } from "@/lib/catalog/labels";
import { getSetting } from "@/lib/settings";
import { formatINR } from "@/lib/money";
import { absoluteUrl, breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { Gallery } from "@/components/product/Gallery";
import { PurchasePanel, type PanelVariant } from "@/components/product/PurchasePanel";
import { DeliveryCheck } from "@/components/product/DeliveryCheck";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { ReviewForm } from "@/components/product/ReviewForm";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { ProductCard } from "@/components/product/ProductCard";
import { Badge, Breadcrumbs, Stars } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/Button";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

async function load(slug: string, preview?: string) {
  const user = await getCurrentUser();
  const canPreview = preview === "1" && hasPermission(user, "products.read");
  return { product: await getProductBySlug(slug, { includeDrafts: canPreview }), user, canPreview };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { product: p } = await load((await params).slug, (await searchParams).preview);
  if (!p) return { title: "Product not found", robots: { index: false } };
  const title = p.seoTitle ?? p.name;
  return {
    title,
    description: p.seoDescription ?? p.shortDescription,
    alternates: { canonical: `/products/${p.slug}` },
    robots: p.status !== "ACTIVE" ? { index: false, follow: false } : undefined,
    openGraph: { title, description: p.shortDescription, type: "website", images: p.images[0] ? [{ url: p.images[0].url, alt: p.images[0].alt }] : undefined },
  };
}

const SIZE_LABEL: Record<string, string> = { rings: "Ring size", bangles: "Bangle size", "mens-jewellery": "Size", chains: "Length", mangalsutras: "Length", necklaces: "Length" };

export default async function ProductPage({ params, searchParams }: Props) {
  const { product: p, user, canPreview } = await load((await params).slug, (await searchParams).preview);
  if (!p) notFound();
  const [tax, related, fbt] = await Promise.all([getSetting("tax"), relatedProducts(p), frequentlyBoughtTogether(p)]);

  const variants: PanelVariant[] = p.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    name: v.name,
    size: v.size,
    price: v.price,
    compareAtPrice: v.compareAtPrice && v.compareAtPrice > v.price ? v.compareAtPrice : null,
    stock: v.inventory?.quantity ?? 0,
    isDefault: v.isDefault,
    metalValue: v.metalValue,
    makingCharges: v.makingCharges,
    stoneValue: v.stoneValue,
    grossWeight: v.grossWeight?.toString() ?? null,
  }));
  const groups = p.attributes.reduce<Record<string, { name: string; value: string }[]>>((acc, a) => {
    (acc[a.group] ??= []).push(a);
    return acc;
  }, {});
  const category = p.primaryCategory;
  const crumbs = [
    { label: "Home", href: "/" },
    ...(category.parent ? [{ label: category.parent.name, href: `/jewellery/${category.parent.slug}` }] : []),
    { label: category.name, href: `/jewellery/${category.slug}` },
    { label: p.name, href: `/products/${p.slug}` },
  ];
  const minPrice = Math.min(...variants.map((v) => v.price));
  const maxPrice = Math.max(...variants.map((v) => v.price));
  const inStock = variants.some((v) => v.stock > 0);
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    description: p.shortDescription,
    image: p.images.map((i) => absoluteUrl(i.url)),
    category: category.name,
    material: metalSummary(p.metalType, p.purity),
    ...(p.ratingCount > 0 && !p.reviews.every((r) => r.isDemo)
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(p.ratingAvg).toFixed(1), reviewCount: p.ratingCount } }
      : {}),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: (minPrice / 100).toFixed(2),
      highPrice: (maxPrice / 100).toFixed(2),
      offerCount: variants.length,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: absoluteUrl(`/products/${p.slug}`),
    },
  };
  const fbtTotal = fbt.reduce((a, c) => a + c.price, 0) + minPrice;

  return (
    <>
      {p.status === "ACTIVE" && <JsonLd data={productLd} />}
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      {canPreview && p.status !== "ACTIVE" && (
        <div className="bg-wine py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-white">Preview — this product is {p.status.toLowerCase()} and not visible to customers</div>
      )}
      <div className="container-x pt-6">
        <Breadcrumbs items={crumbs} />
      </div>
      <section className="container-x mt-6 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Gallery images={p.images} name={p.name} />
          {p.isDemo && <p className="mt-2 text-xs text-muted">Photos are representative stock images for this demo catalogue.</p>}
        </div>
        <div>
          <p className="eyebrow">{metalSummary(p.metalType, p.purity)}</p>
          <h1 className="mt-2 text-4xl leading-tight md:text-5xl">{p.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span>SKU {p.sku}</span>
            {p.ratingCount > 0 && <a href="#reviews"><Stars value={Number(p.ratingAvg)} count={p.ratingCount} /></a>}
            {p.isBestSeller && <Badge tone="gold">Best seller</Badge>}
          </div>
          <p className="mt-5 leading-relaxed text-charcoal/85">{p.shortDescription}</p>
          <div className="mt-8">
            <PurchasePanel
              productId={p.id}
              name={p.name}
              variants={variants}
              sizeLabel={SIZE_LABEL[category.slug] ?? "Size"}
              taxRateBps={tax.gstRateBps}
              taxIncluded={tax.pricesIncludeTax}
              isPriceEstimated={p.isPriceEstimated}
            />
          </div>
          <div className="mt-6"><DeliveryCheck /></div>

          <div className="mt-8 divide-y divide-line border-y border-line">
            <details open className="group py-4">
              <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em]">Description</summary>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-charcoal/85">
                {p.description.split(/\n\n+/).map((para, i) => <p key={i}>{para}</p>)}
              </div>
            </details>
            <details open className="py-4">
              <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em]">Specifications</summary>
              <div className="mt-3 grid gap-5 sm:grid-cols-2" data-testid="specifications">
                {Object.entries(groups).map(([group, attrs]) => (
                  <dl key={group} className="text-sm">
                    <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-gold">{group}</p>
                    {attrs.map((a) => (
                      <div key={a.name} className="flex justify-between gap-4 border-b border-line/60 py-1.5">
                        <dt className="text-muted">{a.name}</dt>
                        <dd className="text-right">{a.value}</dd>
                      </div>
                    ))}
                  </dl>
                ))}
              </div>
            </details>
            <details className="py-4">
              <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em]">Certification</summary>
              <p className="mt-3 text-sm text-charcoal/85">
                {p.certification ?? "Certification details have not been provided for this product. Please contact customer care before purchase if you require a certificate."}
              </p>
            </details>
            {p.careInstructions && (
              <details className="py-4">
                <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em]">Care instructions</summary>
                <p className="mt-3 text-sm text-charcoal/85">{p.careInstructions}</p>
              </details>
            )}
            <details className="py-4">
              <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em]">Shipping, returns &amp; warranty</summary>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-charcoal/85">
                <li>Fully insured delivery; delivery estimate shown above for your PIN code.</li>
                <li>Eligible items can be returned or exchanged within 15 days. <Link href="/pages/returns-and-exchange" className="text-gold underline">Policy</Link></li>
                <li><Link href="/pages/warranty" className="text-gold underline">Warranty information</Link></li>
              </ul>
            </details>
          </div>
        </div>
      </section>

      {fbt.length > 0 && (
        <section className="container-x mt-20" aria-labelledby="fbt-heading">
          <h2 id="fbt-heading" className="mb-8 text-3xl">Frequently bought together</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-6">
            {fbt.map((c) => <ProductCard key={c.id} product={c} />)}
            <div className="col-span-2 flex flex-col justify-center border border-line bg-white p-6 md:col-span-1">
              <p className="text-sm text-muted">Complete the look</p>
              <p className="mt-1 font-display text-2xl">{formatINR(fbtTotal)}</p>
              <p className="mt-1 text-xs text-muted">Combined price with this {category.name.toLowerCase().replace(/s$/, "")}</p>
            </div>
          </div>
        </section>
      )}

      <section id="reviews" className="container-x mt-20 grid gap-10 lg:grid-cols-[1fr_1.4fr]" aria-labelledby="reviews-heading">
        <div>
          <h2 id="reviews-heading" className="text-3xl">Reviews</h2>
          {p.ratingCount > 0 ? (
            <div className="mt-4 flex items-end gap-3">
              <span className="font-display text-5xl">{Number(p.ratingAvg).toFixed(1)}</span>
              <Stars value={Number(p.ratingAvg)} count={p.ratingCount} className="mb-2" />
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">No reviews yet.</p>
          )}
          <div className="mt-8">
            {user ? <ReviewForm productId={p.id} /> : <ButtonLink href={`/login?next=/products/${p.slug}%23reviews`} variant="outline">Sign in to write a review</ButtonLink>}
          </div>
        </div>
        <ul className="space-y-6">
          {p.reviews.map((r) => (
            <li key={r.id} className="border-b border-line pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <Stars value={r.rating} />
                <p className="font-semibold">{r.title}</p>
                {r.isDemo && <Badge>Sample review</Badge>}
                {r.isVerifiedPurchase && <Badge tone="success">Verified purchase</Badge>}
              </div>
              <p className="mt-2 text-sm text-charcoal/85">{r.body}</p>
              <p className="mt-2 text-xs text-muted">{r.authorName} · {r.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <section className="container-x mt-20" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-8 text-3xl">You may also like</h2>
          <ProductCarousel products={related} label="Related products" />
        </section>
      )}
      <RecentlyViewed currentSlug={p.slug} />
    </>
  );
}
