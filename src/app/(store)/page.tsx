import Link from "next/link";
import { ArrowRight, BadgeIndianRupee, CalendarHeart, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import { prisma } from "@/lib/db";
import { getNavigation, productCards } from "@/lib/catalog/queries";
import { getSetting } from "@/lib/settings";
import { formatINR } from "@/lib/money";
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
  const featuredCollections = nav.collections.filter((c) => ["traditional", "contemporary", "premium", "gifts-for-him"].includes(c.slug));

  return (
    <>
      <HeroSlider slides={hero} />

      {/* Shop by category */}
      <section className="container-x py-20 md:py-24" aria-labelledby="cat-heading">
        <div className="mb-10 text-center">
          <p className="eyebrow mb-2">Explore</p>
          <h2 id="cat-heading" className="text-3xl md:text-[2.6rem]">Shop by category</h2>
        </div>
        <ul className="scrollbar-none -mx-4 flex gap-5 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-6 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-7">
          {nav.types.slice(0, 13).map((c) => (
            <li key={c.slug} className="w-28 shrink-0 md:w-auto">
              <Link href={`/jewellery/${c.slug}`} className="group flex flex-col items-center gap-3 text-center">
                <span className="relative aspect-square w-full overflow-hidden rounded-full bg-cream ring-1 ring-line transition group-hover:ring-gold-300">
                  {c.imageUrl && <ProductImage src={c.imageUrl} alt="" fill sizes="160px" className="object-cover transition-transform duration-700 group-hover:scale-110" />}
                </span>
                <span className="text-sm text-charcoal group-hover:text-gold">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Shop by occasion */}
      <section className="bg-cream py-20 md:py-24" aria-labelledby="occ-heading">
        <div className="container-x">
          <SectionHeading eyebrow="For every moment" title="Shop by occasion" action={<Link href="/shop" className="text-xs font-semibold uppercase tracking-[0.14em] text-gold hover:underline">All jewellery →</Link>} />
          <ul className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-0">
            {nav.occasions.map((o, i) => (
              <li key={o.slug} className={i < 4 ? "w-[60%] shrink-0 snap-start md:w-auto" : "w-[60%] shrink-0 snap-start md:w-auto"}>
                <Link href={`/jewellery/${o.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-sand">
                  {o.imageUrl && <ProductImage src={o.imageUrl} alt="" fill sizes="(min-width:768px) 25vw, 60vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-ink/75 via-ink/20 to-transparent p-5 text-ivory">
                    <span className="font-display text-2xl">{o.name}</span>
                    <ArrowRight className="size-4 translate-x-0 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* New arrivals */}
      <section className="container-x py-20 md:py-24" aria-label="New arrivals">
        <SectionHeading eyebrow="Just in" title="New arrivals" action={<Link href="/collections/new-arrivals" className="text-xs font-semibold uppercase tracking-[0.14em] text-gold hover:underline">View all →</Link>} />
        <ProductCarousel products={newArrivals} label="New arrivals" />
      </section>

      {/* Editorial banners */}
      {editorial.length > 0 && (
        <section className="container-x pb-20 md:pb-24" aria-label="Featured stories">
          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            {editorial.map((b) => (
              <Link key={b.id} href={b.ctaHref ?? "/shop"} className="group relative block aspect-[4/5] overflow-hidden bg-ink">
                <ProductImage src={b.imageUrl} alt={b.imageAlt} fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover transition-transform duration-1000 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-ivory md:p-8">
                  <h3 className="text-3xl leading-tight">{b.title}</h3>
                  {b.subtitle && <p className="mt-2 max-w-xs text-sm text-ivory/80">{b.subtitle}</p>}
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-300">{b.ctaLabel ?? "Discover"} <ArrowRight className="size-3.5" /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Best sellers */}
      <section className="container-x pb-20 md:pb-24" aria-label="Best sellers">
        <SectionHeading eyebrow="Most loved" title="Best sellers" align="center" />
        <ProductGrid products={bestSellers} />
        <div className="mt-12 text-center"><ButtonLink href="/collections/best-sellers" variant="outline">Shop all best sellers</ButtonLink></div>
      </section>

      {/* Lightweight */}
      <section className="border-y border-line bg-white py-20 md:py-24" aria-labelledby="light-heading">
        <div className="container-x grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="max-w-md">
            <p className="eyebrow mb-3">Everyday luxury</p>
            <h2 id="light-heading" className="text-4xl leading-tight md:text-5xl">Light on the skin, lasting in style</h2>
            <p className="mt-5 text-charcoal/80">Lightweight gold and diamond pieces designed for desk-to-dinner wear — comfortable enough to forget you&apos;re wearing them.</p>
            <ButtonLink href="/collections/lightweight" className="mt-8">Shop lightweight</ButtonLink>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
            {lightweight.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* Bridal */}
      <section className="bg-ink py-20 text-ivory md:py-28" aria-labelledby="bridal-heading">
        <div className="container-x grid gap-12 lg:grid-cols-2 lg:items-center">
          <Link href="/collections/bridal" className="group relative block aspect-[4/5] overflow-hidden lg:aspect-[5/6]">
            <ProductImage src="/images/collections/bridal.svg" alt="Bridal collection illustration" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover transition-transform duration-1000 group-hover:scale-105" />
          </Link>
          <div>
            <p className="eyebrow mb-3 text-gold-300">The bridal collection</p>
            <h2 id="bridal-heading" className="text-4xl leading-tight md:text-6xl">For the day you&apos;ll remember forever</h2>
            <p className="mt-5 max-w-lg text-ivory/75">Polki, kundan and gold, made by hand. Plan your bridal trousseau with a stylist or explore the full collection online.</p>
            <div className="mt-10 grid grid-cols-3 gap-3 md:gap-5">
              {bridal.map((p) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="group block">
                  <span className="relative block aspect-[4/5] overflow-hidden bg-charcoal">
                    {p.image && <ProductImage src={p.image.url} alt={p.image.alt} fill sizes="200px" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
                  </span>
                  <span className="mt-2 block truncate font-display text-base text-ivory/90">{p.name}</span>
                  <span className="block text-xs text-gold-300">{formatINR(p.price)}</span>
                </Link>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/collections/bridal" variant="gold">Explore bridal</ButtonLink>
              <ButtonLink href="/book-consultation" variant="outline" className="border-ivory text-ivory hover:bg-ivory hover:text-ink">Book a bridal consultation</ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Diamond & gold highlights */}
      <section className="container-x py-20 md:py-24" aria-label="Diamond and gold">
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          {[
            { href: "/jewellery/diamond", title: "Diamonds, brilliantly set", body: "Solitaires, eternity bands and tennis bracelets in 18K gold and platinum.", img: "/images/categories/diamond.svg", cta: "Shop diamond" },
            { href: "/jewellery/gold", title: "The warmth of pure gold", body: "22K and 18K gold — bangles, chains and heritage pieces.", img: "/images/categories/gold.svg", cta: "Shop gold" },
          ].map((t) => (
            <Link key={t.href} href={t.href} className="group grid grid-cols-[1fr_1.1fr] overflow-hidden bg-cream">
              <span className="relative block min-h-64">
                <ProductImage src={t.img} alt="" fill sizes="(min-width:768px) 25vw, 50vw" className="object-cover transition-transform duration-1000 group-hover:scale-105" />
              </span>
              <span className="flex flex-col justify-center p-6 md:p-10">
                <span className="font-display text-2xl leading-tight md:text-3xl">{t.title}</span>
                <span className="mt-3 text-sm text-muted">{t.body}</span>
                <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold">{t.cta} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Gifts */}
      <section className="bg-cream py-20 md:py-24" aria-labelledby="gift-heading">
        <div className="container-x">
          <SectionHeading eyebrow="The gift guide" title="Gifts they'll treasure" />
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
            <ul className="grid grid-cols-2 gap-3 self-start">
              {[
                { label: "Under ₹10,000", href: "/shop?priceMax=10000" },
                { label: "Under ₹25,000", href: "/shop?priceMax=25000" },
                { label: "Under ₹50,000", href: "/shop?priceMax=50000" },
                { label: "Gifts for her", href: "/collections/gifts-for-her" },
                { label: "Gifts for him", href: "/collections/gifts-for-him" },
                { label: "Anniversary", href: "/jewellery/anniversary-gifts" },
              ].map((g) => (
                <li key={g.href}>
                  <Link href={g.href} className="flex h-full items-center justify-between border border-line bg-ivory px-4 py-4 text-sm transition-colors hover:border-gold hover:text-gold">
                    {g.label} <ArrowRight className="size-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
              {gifts.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </div>
      </section>

      {/* Collections */}
      <section className="container-x py-20 md:py-24" aria-label="Featured collections">
        <SectionHeading eyebrow="Curated" title="Featured collections" action={<Link href="/collections" className="text-xs font-semibold uppercase tracking-[0.14em] text-gold hover:underline">All collections →</Link>} />
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
          {featuredCollections.map((c) => (
            <li key={c.slug}>
              <Link href={`/collections/${c.slug}`} className="group block">
                <span className="relative block aspect-[4/5] overflow-hidden bg-cream">
                  {c.imageUrl && <ProductImage src={c.imageUrl} alt="" fill sizes="(min-width:768px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
                </span>
                <span className="mt-3 block font-display text-xl group-hover:text-gold">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Brand story */}
      <section className="bg-white py-20 md:py-28" aria-labelledby="story-heading">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <div className="relative aspect-square overflow-hidden">
            <ProductImage src="/images/brand/craft.svg" alt="Craftsmanship illustration" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div className="max-w-lg">
            <p className="eyebrow mb-3">Our craft</p>
            <h2 id="story-heading" className="text-4xl leading-tight md:text-5xl">Made slowly, by hand, to be worn for a lifetime</h2>
            <p className="mt-6 leading-relaxed text-charcoal/80">Every {store.name} piece begins as a sketch and is finished by skilled artisans — setting stones, polishing edges and checking each clasp by hand.</p>
            <p className="mt-4 leading-relaxed text-charcoal/80">We show full specifications for every product and a transparent price breakdown wherever metal, stone and making-charge data is available.</p>
            <ButtonLink href="/pages/about-us" variant="link" className="mt-6">Read our story</ButtonLink>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-y border-line" aria-label="Why shop with us">
        <ul className="container-x grid grid-cols-2 gap-8 py-12 md:grid-cols-5">
          {[
            { icon: Truck, title: "Insured shipping", body: `Free above ${formatINR(shipping.freeShippingThreshold)}`, href: "/pages/shipping-policy" },
            { icon: RefreshCcw, title: "Easy returns", body: "15-day returns on eligible pieces", href: "/pages/returns-and-exchange" },
            { icon: BadgeIndianRupee, title: "Transparent pricing", body: "Price breakdowns where available", href: "/pages/terms-of-service" },
            { icon: ShieldCheck, title: "Secure payments", body: "We never store card details", href: "/pages/privacy-policy" },
            { icon: CalendarHeart, title: "Expert help", body: store.supportHours, href: "/contact" },
          ].map(({ icon: Icon, ...t }) => (
            <li key={t.title}>
              <Link href={t.href} className="group flex flex-col items-center gap-2 text-center">
                <Icon className="size-7 text-gold" strokeWidth={1.3} />
                <span className="text-sm font-semibold group-hover:text-gold">{t.title}</span>
                <span className="text-xs text-muted">{t.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Testimonials (demo) */}
      <section className="container-x py-20 md:py-24" aria-labelledby="testimonial-heading">
        <SectionHeading eyebrow="Kind words" title="What customers say" align="center" />
        <p className="-mt-6 mb-10 text-center text-xs text-muted">Sample testimonials shown for demonstration — replace with verified reviews before launch.</p>
        <ul className="grid gap-6 md:grid-cols-3">
          {[
            { quote: "The bridal set was even more beautiful in person. The stylist helped us plan every piece.", name: "Demo customer", place: "Sample review" },
            { quote: "Light enough to wear to work every day, and I always get compliments on my studs.", name: "Demo customer", place: "Sample review" },
            { quote: "Clear pricing and the delivery date was exactly as promised at checkout.", name: "Demo customer", place: "Sample review" },
          ].map((t, i) => (
            <li key={i} className="flex flex-col border border-line bg-white p-8">
              <span className="font-display text-5xl leading-none text-gold-300" aria-hidden>“</span>
              <blockquote className="mt-2 flex-1 font-display text-xl leading-snug">{t.quote}</blockquote>
              <p className="mt-6 text-xs uppercase tracking-[0.14em] text-muted">{t.name} · {t.place}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Consultation / store */}
      {consultation.isActive && (
        <section className="container-x pb-20 md:pb-24" aria-labelledby="consult-heading">
          <div className="grid overflow-hidden bg-cream lg:grid-cols-2">
            <div className="relative min-h-72">
              <ProductImage src="/images/brand/consultation.svg" alt="Consultation illustration" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="p-8 md:p-14">
              <p className="eyebrow mb-3">Personal styling</p>
              <h2 id="consult-heading" className="text-3xl leading-tight md:text-4xl">{consultation.title}</h2>
              <p className="mt-4 text-charcoal/80">{consultation.body}</p>
              <dl className="mt-6 space-y-1 text-sm">
                <dt className="font-semibold">{consultation.storeName}</dt>
                <dd className="text-muted">{consultation.storeAddress}</dd>
                <dd className="text-muted">{consultation.storeHours}</dd>
              </dl>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/book-consultation">Book a consultation</ButtonLink>
                {consultation.mapUrl && <ButtonLink href={consultation.mapUrl} variant="outline" target="_blank" rel="noopener noreferrer">Get directions</ButtonLink>}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="bg-gold-100/60 py-16" aria-labelledby="nl-heading">
        <div className="container-x flex flex-col items-center gap-4 text-center">
          <p className="eyebrow">Stay in touch</p>
          <h2 id="nl-heading" className="text-3xl md:text-4xl">Be first to see new collections</h2>
          <NewsletterForm tone="light" />
        </div>
      </section>
    </>
  );
}
