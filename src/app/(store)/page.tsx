import Link from "next/link";
import { ArrowRight, BadgeIndianRupee, CalendarHeart, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import { prisma } from "@/lib/db";
import { getNavigation, productCards } from "@/lib/catalog/queries";
import { getSetting } from "@/lib/settings";
import { formatINR } from "@/lib/money";
import { BRAND_PHOTOS, CATEGORY_PHOTOS, COLLECTION_PHOTOS, photoUrl } from "@/lib/photos";
import { HeroSlider } from "@/components/home/HeroSlider";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { ProductCard, ProductGrid } from "@/components/product/ProductCard";
import { ProductImage } from "@/components/ui/ProductImage";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/misc";
import { NewsletterForm } from "@/components/layout/NewsletterForm";

export const dynamic = "force-dynamic";

const now = () => new Date();
const bannerWhere = (placement: "HERO" | "EDITORIAL") => ({
  placement,
  isActive: true,
  AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now() } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now() } }] }],
});

/** Categories featured on the home page, in display order. */
const FEATURED_TYPES = ["rings", "earrings", "necklaces", "bangles", "mangalsutras", "pendants"];

export default async function HomePage() {
  const [hero, editorial, nav, newArrivals, bestSellers, lightweight, bridal, gifts, consultation, shipping, store] = await Promise.all([
    prisma.banner.findMany({ where: bannerWhere("HERO"), orderBy: { sortOrder: "asc" } }),
    prisma.banner.findMany({ where: bannerWhere("EDITORIAL"), orderBy: { sortOrder: "asc" }, take: 3 }),
    getNavigation(),
    productCards({}, { take: 10, sort: "newest" }),
    productCards({ isBestSeller: true }, { take: 8 }),
    productCards({ isLightweight: true, inStock: true }, { take: 4 }),
    productCards({ collections: { some: { collection: { slug: "bridal" } } } }, { take: 3 }),
    productCards({ minPrice: { lte: 2_500_000 }, inStock: true }, { take: 4 }),
    getSetting("consultation"),
    getSetting("shipping"),
    getSetting("store"),
  ]);
  const types = FEATURED_TYPES.map((slug) => nav.types.find((c) => c.slug === slug)).filter((c) => c != null);
  const featuredCollections = nav.collections.filter((c) => ["traditional", "contemporary", "premium", "gifts-for-him"].includes(c.slug));

  return (
    <>
      <HeroSlider slides={hero} />

      {/* Shop by category */}
      <section className="container-x py-20 md:py-28" aria-labelledby="cat-heading">
        <div className="mb-12 text-center">
          <p className="eyebrow mb-3">Explore</p>
          <h2 id="cat-heading" className="text-[2rem] md:text-[2.8rem]">Shop by category</h2>
        </div>
        <ul className="scrollbar-none -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-6 md:gap-5 md:overflow-visible md:px-0">
          {types.map((c) => (
            <li key={c.slug} className="w-[42%] shrink-0 snap-start sm:w-[30%] md:w-auto">
              <Link href={`/jewellery/${c.slug}`} className="group block text-center">
                <span className="relative block aspect-[3/4] overflow-hidden bg-cream">
                  {c.imageUrl && <ProductImage src={c.imageUrl} alt="" fill sizes="(min-width:768px) 16vw, 42vw" className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105" />}
                </span>
                <span className="mt-4 block font-display text-xl transition-colors group-hover:text-gold">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10 text-center"><Link href="/shop" className="link-caps">Shop all jewellery</Link></div>
      </section>

      {/* Editorial stories */}
      {editorial.length > 0 && (
        <section className="container-x pb-20 md:pb-28" aria-label="Featured stories">
          <div className="grid gap-4 md:grid-cols-3 md:gap-5">
            {editorial.map((b) => (
              <Link key={b.id} href={b.ctaHref ?? "/shop"} className="group relative block aspect-[4/5] overflow-hidden bg-ink md:aspect-[3/4]">
                <ProductImage src={b.imageUrl} alt={b.imageAlt} fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover object-[center_30%] transition-transform duration-[1.5s] ease-out group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/5 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7 text-ivory md:p-9">
                  <h3 className="text-[2rem] leading-tight">{b.title}</h3>
                  {b.subtitle && <p className="mt-2 max-w-xs text-sm text-ivory/80">{b.subtitle}</p>}
                  <span className="mt-5 inline-flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em]">{b.ctaLabel ?? "Discover"} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* New arrivals */}
      <section className="border-t border-line py-20 md:py-28" aria-label="New arrivals">
        <div className="container-x">
          <SectionHeading eyebrow="Just in" title="New arrivals" action={<Link href="/collections/new-arrivals" className="link-caps">View all</Link>} />
          <ProductCarousel products={newArrivals} label="New arrivals" />
        </div>
      </section>

      {/* Bridal */}
      <section className="bg-ink text-ivory" aria-labelledby="bridal-heading">
        <div className="grid lg:grid-cols-2">
          <Link href="/collections/bridal" className="group relative block aspect-[4/5] overflow-hidden lg:aspect-auto lg:min-h-[760px]">
            <ProductImage src={photoUrl(BRAND_PHOTOS.bridal)} alt="Bride wearing a polki necklace and matching earrings" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover object-[center_20%] transition-transform duration-[1.5s] ease-out group-hover:scale-[1.03]" />
          </Link>
          <div className="flex items-center px-6 py-16 md:px-14 lg:px-20">
            <div className="w-full max-w-xl">
              <p className="eyebrow mb-4 text-gold-300">The bridal collection</p>
              <h2 id="bridal-heading" className="text-4xl leading-[1.08] md:text-[3.6rem]">For the day you&apos;ll remember forever</h2>
              <p className="mt-6 max-w-lg leading-relaxed text-ivory/70">Polki, kundan and gold, made by hand. Plan your bridal trousseau with a stylist, or explore the full collection online.</p>
              <div className="mt-10 grid grid-cols-3 gap-3 md:gap-4">
                {bridal.map((p) => (
                  <Link key={p.id} href={`/products/${p.slug}`} className="group block">
                    <span className="relative block aspect-[4/5] overflow-hidden bg-charcoal">
                      {p.image && <ProductImage src={p.image.url} alt={p.image.alt} fill sizes="180px" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
                    </span>
                    <span className="mt-3 block truncate font-display text-base text-ivory/90">{p.name}</span>
                    <span className="block text-xs tracking-wide text-ivory/55">{formatINR(p.price)}</span>
                  </Link>
                ))}
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                <ButtonLink href="/collections/bridal" variant="light">Explore bridal</ButtonLink>
                <ButtonLink href="/book-consultation" variant="outline-light">Book a bridal appointment</ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Best sellers */}
      <section className="container-x py-20 md:py-28" aria-label="Best sellers">
        <SectionHeading eyebrow="Most loved" title="Best sellers" align="center" />
        <ProductGrid products={bestSellers} />
        <div className="mt-14 text-center"><ButtonLink href="/collections/best-sellers" variant="outline">Shop all best sellers</ButtonLink></div>
      </section>

      {/* Diamond & gold */}
      <section className="container-x pb-20 md:pb-28" aria-label="Diamond and gold">
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          {[
            { href: "/jewellery/diamond", eyebrow: "The Diamond Room", title: "Brilliance, set by hand", cta: "Shop diamonds", img: photoUrl(CATEGORY_PHOTOS.diamond) },
            { href: "/jewellery/gold", eyebrow: "Heritage gold", title: "The warmth of pure gold", cta: "Shop gold", img: photoUrl(CATEGORY_PHOTOS.gold) },
          ].map((t) => (
            <Link key={t.href} href={t.href} className="group relative block aspect-[4/3] overflow-hidden bg-ink">
              <ProductImage src={t.img} alt="" fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7 text-ivory md:p-10">
                <p className="eyebrow text-gold-300">{t.eyebrow}</p>
                <p className="mt-2 font-display text-3xl md:text-[2.4rem]">{t.title}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em]">{t.cta} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Shop by occasion */}
      <section className="bg-cream py-20 md:py-28" aria-labelledby="occ-heading">
        <div className="container-x">
          <SectionHeading eyebrow="For every moment" title="Shop by occasion" action={<Link href="/shop" className="link-caps">All jewellery</Link>} />
          <ul className="scrollbar-none -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-0">
            {nav.occasions.slice(0, 4).map((o) => (
              <li key={o.slug} className="w-[62%] shrink-0 snap-start md:w-auto">
                <Link href={`/jewellery/${o.slug}`} className="group block">
                  <span className="relative block aspect-[4/5] overflow-hidden bg-sand">
                    {o.imageUrl && <ProductImage src={o.imageUrl} alt="" fill sizes="(min-width:768px) 25vw, 62vw" className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105" />}
                  </span>
                  <span className="mt-4 flex items-center justify-between font-display text-2xl">
                    {o.name}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Lightweight */}
      <section className="container-x py-20 md:py-28" aria-labelledby="light-heading">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <Link href="/collections/lightweight" className="group relative block aspect-[4/5] overflow-hidden bg-cream">
            <ProductImage src={photoUrl(COLLECTION_PHOTOS.lightweight)} alt="Model wearing a fine diamond necklace" fill sizes="(min-width:1024px) 45vw, 100vw" className="object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-[1.03]" />
          </Link>
          <div>
            <p className="eyebrow mb-3">Everyday luxury</p>
            <h2 id="light-heading" className="max-w-md text-4xl leading-tight md:text-5xl">Light on the skin, lasting in style</h2>
            <p className="mt-5 max-w-md leading-relaxed text-charcoal/75">Lightweight gold and diamond pieces designed for desk-to-dinner wear — comfortable enough to forget you&apos;re wearing them.</p>
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10">
              {lightweight.slice(0, 2).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            <Link href="/collections/lightweight" className="link-caps mt-10 inline-block">Shop lightweight</Link>
          </div>
        </div>
      </section>

      {/* Gifts */}
      <section className="border-t border-line py-20 md:py-28" aria-labelledby="gift-heading">
        <div className="container-x">
          <SectionHeading eyebrow="The gift guide" title="Gifts they'll treasure" />
          <div className="grid gap-12 lg:grid-cols-[1fr_2.4fr]">
            <ul className="self-start border-t border-line">
              {[
                { label: "Under ₹10,000", href: "/shop?priceMax=10000" },
                { label: "Under ₹25,000", href: "/shop?priceMax=25000" },
                { label: "Under ₹50,000", href: "/shop?priceMax=50000" },
                { label: "Gifts for her", href: "/collections/gifts-for-her" },
                { label: "Gifts for him", href: "/collections/gifts-for-him" },
                { label: "Anniversary", href: "/jewellery/anniversary-gifts" },
              ].map((g) => (
                <li key={g.href} className="border-b border-line">
                  <Link href={g.href} className="group flex items-center justify-between py-4 font-display text-xl transition-colors hover:text-gold">
                    {g.label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-5">
              {gifts.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </div>
      </section>

      {/* Collections */}
      <section className="bg-cream py-20 md:py-28" aria-label="Featured collections">
        <div className="container-x">
          <SectionHeading eyebrow="Curated" title="Featured collections" action={<Link href="/collections" className="link-caps">All collections</Link>} />
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {featuredCollections.map((c) => (
              <li key={c.slug}>
                <Link href={`/collections/${c.slug}`} className="group block">
                  <span className="relative block aspect-[4/5] overflow-hidden bg-sand">
                    {c.imageUrl && <ProductImage src={c.imageUrl} alt="" fill sizes="(min-width:768px) 25vw, 50vw" className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105" />}
                  </span>
                  <span className="mt-4 block font-display text-xl transition-colors group-hover:text-gold">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Brand story */}
      <section className="container-x py-20 md:py-28" aria-labelledby="story-heading">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="relative aspect-[4/5] overflow-hidden bg-cream lg:order-2">
            <ProductImage src={photoUrl(BRAND_PHOTOS.craft)} alt="Jeweller setting a stone at her workbench" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div className="max-w-lg">
            <p className="eyebrow mb-3">Our craft</p>
            <h2 id="story-heading" className="text-4xl leading-tight md:text-5xl">Made slowly, by hand, to be worn for a lifetime</h2>
            <p className="mt-6 leading-relaxed text-charcoal/75">Every {store.name} piece begins as a sketch and is finished by skilled artisans — setting stones, polishing edges and checking each clasp by hand.</p>
            <p className="mt-4 leading-relaxed text-charcoal/75">We show full specifications for every product and a transparent price breakdown wherever metal, stone and making-charge data is available.</p>
            <Link href="/pages/about-us" className="link-caps mt-8 inline-block">Read our story</Link>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-y border-line" aria-label="Why shop with us">
        <ul className="container-x grid grid-cols-2 gap-8 py-14 md:grid-cols-5">
          {[
            { icon: Truck, title: "Insured shipping", body: `Free above ${formatINR(shipping.freeShippingThreshold)}`, href: "/pages/shipping-policy" },
            { icon: RefreshCcw, title: "Easy returns", body: "15-day returns on eligible pieces", href: "/pages/returns-and-exchange" },
            { icon: BadgeIndianRupee, title: "Transparent pricing", body: "Price breakdowns where available", href: "/pages/terms-of-service" },
            { icon: ShieldCheck, title: "Secure payments", body: "We never store card details", href: "/pages/privacy-policy" },
            { icon: CalendarHeart, title: "Expert help", body: store.supportHours, href: "/contact" },
          ].map(({ icon: Icon, ...t }) => (
            <li key={t.title}>
              <Link href={t.href} className="group flex flex-col items-center gap-2.5 text-center">
                <Icon className="size-6 text-gold" strokeWidth={1.2} />
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] group-hover:text-gold">{t.title}</span>
                <span className="text-xs text-muted">{t.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Testimonials (demo) */}
      <section className="container-x py-20 md:py-28" aria-labelledby="testimonial-heading">
        <SectionHeading eyebrow="Kind words" title="What customers say" align="center" />
        <p className="-mt-6 mb-12 text-center text-xs text-muted">Sample testimonials shown for demonstration — replace with verified reviews before launch.</p>
        <ul className="grid gap-10 md:grid-cols-3 md:gap-12">
          {[
            { quote: "The bridal set was even more beautiful in person. The stylist helped us plan every piece.", name: "Demo customer", place: "Sample review" },
            { quote: "Light enough to wear to work every day, and I always get compliments on my studs.", name: "Demo customer", place: "Sample review" },
            { quote: "Clear pricing and the delivery date was exactly as promised at checkout.", name: "Demo customer", place: "Sample review" },
          ].map((t, i) => (
            <li key={i} className="flex flex-col items-center text-center">
              <blockquote className="font-display text-2xl leading-snug">“{t.quote}”</blockquote>
              <p className="mt-6 text-[0.66rem] uppercase tracking-[0.2em] text-muted">{t.name} · {t.place}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Consultation / store */}
      {consultation.isActive && (
        <section className="bg-cream" aria-labelledby="consult-heading">
          <div className="grid lg:grid-cols-2">
            <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[560px]">
              <ProductImage src={photoUrl(BRAND_PHOTOS.consultation)} alt="Bride smiling in a gold maang tikka and necklace" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover object-[center_30%]" />
            </div>
            <div className="flex items-center px-6 py-16 md:px-14 lg:px-20">
              <div className="max-w-lg">
                <p className="eyebrow mb-3">Personal styling</p>
                <h2 id="consult-heading" className="text-4xl leading-tight md:text-5xl">{consultation.title}</h2>
                <p className="mt-5 leading-relaxed text-charcoal/75">{consultation.body}</p>
                <dl className="mt-8 space-y-1 text-sm">
                  <dt className="font-semibold">{consultation.storeName}</dt>
                  <dd className="text-muted">{consultation.storeAddress}</dd>
                  <dd className="text-muted">{consultation.storeHours}</dd>
                </dl>
                <div className="mt-9 flex flex-wrap gap-3">
                  <ButtonLink href="/book-consultation">Book a consultation</ButtonLink>
                  {consultation.mapUrl && <ButtonLink href={consultation.mapUrl} variant="outline" target="_blank" rel="noopener noreferrer">Get directions</ButtonLink>}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="pt-20 md:pt-24" aria-labelledby="nl-heading">
        <div className="container-x flex flex-col items-center gap-4 text-center">
          <p className="eyebrow">Stay in touch</p>
          <h2 id="nl-heading" className="text-3xl md:text-[2.6rem]">Be first to see new collections</h2>
          <p className="max-w-md text-sm text-muted">Private previews, styling notes and invitations — never more than twice a month.</p>
          <NewsletterForm tone="light" />
        </div>
      </section>
    </>
  );
}
