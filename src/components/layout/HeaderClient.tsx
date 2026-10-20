"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import type { Navigation } from "@/lib/catalog/queries";
import { BRAND_PHOTOS, COLLECTION_PHOTOS, EDITORIAL_PHOTOS, photoUrl } from "@/lib/photos";
import { useStore } from "@/components/providers/StoreProvider";
import { Sheet } from "@/components/ui/Sheet";
import { ProductImage } from "@/components/ui/ProductImage";
import { cn } from "@/lib/cn";
import { SearchBox } from "./SearchBox";

type MenuKey = "jewellery" | "metal" | "occasion" | "collections";
type Feature = { title: string; caption: string; href: string; image: string };

const QUICK_LINKS = [
  { label: "New arrivals", href: "/collections/new-arrivals" },
  { label: "Best sellers", href: "/collections/best-sellers" },
  { label: "Gifts under ₹25,000", href: "/shop?priceMax=25000" },
  { label: "Book a consultation", href: "/book-consultation" },
];

export function HeaderClient({ nav, storeName }: { nav: Navigation; storeName: string }) {
  const { cartCount, openDrawer, wishlist, user } = useStore();
  const [menu, setMenu] = useState<MenuKey | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Close menus when the route changes (state reset during render, per React guidance).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenu(null);
    setMobileOpen(false);
    setSearchOpen(false);
  }
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const menus: { key: MenuKey; label: string; heading: string; items: Navigation["types"]; base: string; features: [Feature, Feature] }[] = [
    {
      key: "jewellery", label: "Jewellery", heading: "Shop by category", items: nav.types, base: "/jewellery",
      features: [
        { title: "Best sellers", caption: "The pieces our clients return to", href: "/collections/best-sellers", image: photoUrl(BRAND_PHOTOS.menuBestSellers) },
        { title: "New arrivals", caption: "Fresh from the atelier", href: "/collections/new-arrivals", image: photoUrl(COLLECTION_PHOTOS["new-arrivals"]) },
      ],
    },
    {
      key: "metal", label: "Gold & Diamonds", heading: "Shop by material", items: nav.materials, base: "/jewellery",
      features: [
        { title: "The Diamond Room", caption: "Solitaires and statement necklaces", href: "/jewellery/diamond", image: photoUrl(BRAND_PHOTOS.menuDiamond) },
        { title: "Heritage gold", caption: "22K, crafted by hand", href: "/jewellery/gold", image: photoUrl(EDITORIAL_PHOTOS[1]) },
      ],
    },
    {
      key: "occasion", label: "Occasions", heading: "Shop by occasion", items: nav.occasions, base: "/jewellery",
      features: [
        { title: "The wedding edit", caption: "For the bride and her family", href: "/jewellery/wedding", image: photoUrl(BRAND_PHOTOS.menuWedding) },
        { title: "Everyday fine", caption: "Light pieces for every day", href: "/jewellery/everyday-wear", image: photoUrl(COLLECTION_PHOTOS.lightweight) },
      ],
    },
    {
      key: "collections", label: "Collections", heading: "Our collections", items: nav.collections, base: "/collections",
      features: [
        { title: "Bridal", caption: "Polki, kundan and gold", href: "/collections/bridal", image: photoUrl(BRAND_PHOTOS.menuBridal) },
        { title: "Premium", caption: "Our finest stones", href: "/collections/premium", image: photoUrl(COLLECTION_PHOTOS.premium) },
      ],
    },
  ];
  const active = menus.find((m) => m.key === menu);

  const enter = (k: MenuKey) => {
    clearTimeout(closeTimer.current);
    setMenu(k);
  };
  const leave = () => {
    closeTimer.current = setTimeout(() => setMenu(null), 120);
  };

  const [brand, ...rest] = storeName.split(" ");
  const iconBtn = "relative inline-flex size-10 items-center justify-center text-ink transition-colors hover:text-gold";
  const navItem = "flex items-center gap-1 px-4 text-[0.7rem] font-medium uppercase tracking-[0.2em] transition-colors";

  return (
    <header className={cn("sticky top-0 z-40 border-b bg-ivory/95 backdrop-blur transition-shadow", scrolled ? "border-line shadow-[0_8px_30px_-24px_rgba(23,21,19,0.5)]" : "border-line/70")}>
      <div className="container-x grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 md:h-20">
        <div className="flex items-center gap-1">
          <button className={cn(iconBtn, "-ml-2 lg:hidden")} onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="size-5" strokeWidth={1.5} />
          </button>
          <div className="hidden w-60 xl:block">
            <SearchBox />
          </div>
          <button className={cn(iconBtn, "xl:hidden")} onClick={() => setSearchOpen((s) => !s)} aria-label="Search" aria-expanded={searchOpen}>
            {searchOpen ? <X className="size-5" strokeWidth={1.5} /> : <Search className="size-5" strokeWidth={1.5} />}
          </button>
        </div>

        <Link href="/" className="flex flex-col items-center leading-none" aria-label={`${storeName} home`}>
          <span className="font-display text-[1.45rem] uppercase tracking-[0.22em] sm:text-[1.7rem] sm:tracking-[0.32em] md:text-[2.1rem]">{brand}</span>
          <span className="mt-1 hidden text-[0.52rem] font-medium uppercase tracking-[0.5em] text-gold sm:block">{rest.join(" ") || "Fine Jewellery"}</span>
        </Link>

        <div className="flex items-center justify-end gap-0.5">
          <Link href="/book-consultation" className="mr-3 hidden text-[0.68rem] font-medium uppercase tracking-[0.18em] text-charcoal hover:text-gold 2xl:block">
            Book an appointment
          </Link>
          <Link href={user ? "/account" : "/login"} className={cn(iconBtn, "max-sm:hidden")} aria-label={user ? `Account (${user.name})` : "Sign in"}>
            <User className="size-5" strokeWidth={1.5} />
          </Link>
          <Link href="/wishlist" className={iconBtn} aria-label={`Wishlist (${wishlist.size} items)`}>
            <Heart className="size-5" strokeWidth={1.5} />
            {wishlist.size > 0 && <span className="absolute right-0.5 top-1 flex size-4 items-center justify-center rounded-full bg-gold text-[0.6rem] font-semibold text-white">{wishlist.size}</span>}
          </Link>
          <button className={cn(iconBtn, "-mr-2")} onClick={openDrawer} aria-label={`Shopping bag (${cartCount} items)`} data-testid="cart-button">
            <ShoppingBag className="size-5" strokeWidth={1.5} />
            {cartCount > 0 && <span data-testid="cart-count" className="absolute right-0.5 top-1 flex size-4 items-center justify-center rounded-full bg-ink text-[0.6rem] font-semibold text-ivory">{cartCount}</span>}
          </button>
        </div>
      </div>

      <nav aria-label="Main" className="hidden h-12 items-stretch justify-center lg:flex" onMouseLeave={leave}>
        {menus.map((m) => (
          <div key={m.key} className="flex items-stretch" onMouseEnter={() => enter(m.key)}>
            <button
              className={cn(navItem, "relative after:absolute after:inset-x-4 after:bottom-0 after:h-px after:origin-left after:bg-ink after:transition-transform", menu === m.key ? "text-ink after:scale-x-100" : "text-charcoal after:scale-x-0 hover:text-ink")}
              aria-expanded={menu === m.key}
              aria-haspopup="true"
              onClick={() => setMenu(menu === m.key ? null : m.key)}
              onKeyDown={(e) => e.key === "Escape" && setMenu(null)}
            >
              {m.label}
              <ChevronDown className={cn("size-3 transition-transform", menu === m.key && "rotate-180")} strokeWidth={1.5} />
            </button>
          </div>
        ))}
        <Link href="/collections/bridal" className={cn(navItem, "text-charcoal hover:text-ink")} onMouseEnter={leave}>Bridal</Link>
        <Link href="/collections/gifts-for-her" className={cn(navItem, "text-charcoal hover:text-ink")} onMouseEnter={leave}>Gifts</Link>
        <Link href="/collections/new-arrivals" className={cn(navItem, "text-gold hover:text-ink")} onMouseEnter={leave}>New in</Link>
      </nav>

      {searchOpen && (
        <div className="container-x animate-fade pb-4 xl:hidden">
          <SearchBox autoFocus onDone={() => setSearchOpen(false)} />
        </div>
      )}

      {active && (
        <div className="absolute inset-x-0 top-full hidden animate-fade border-t border-line bg-ivory shadow-[0_30px_50px_-40px_rgba(23,21,19,0.55)] lg:block" onMouseEnter={() => enter(active.key)} onMouseLeave={leave}>
          <div className="container-x grid grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,2fr)] gap-12 py-10">
            <div>
              <p className="eyebrow mb-5">{active.heading}</p>
              <ul className="grid grid-cols-2 gap-x-10">
                {active.items.map((it) => (
                  <li key={it.slug}>
                    <Link href={`${active.base}/${it.slug}`} className="block py-1.5 font-display text-[1.15rem] text-charcoal transition-colors hover:text-gold">
                      {it.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={active.key === "collections" ? "/collections" : "/shop"} className="link-caps mt-6 inline-block">
                View all
              </Link>
            </div>
            <div className="border-l border-line pl-10">
              <p className="eyebrow mb-5">Discover</p>
              <ul className="space-y-3 text-sm text-charcoal">
                {QUICK_LINKS.map((l) => (
                  <li key={l.href}><Link href={l.href} className="hover:text-gold">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {active.features.map((f) => (
                <Link key={f.href} href={f.href} className="group block">
                  <span className="relative block aspect-[4/5] overflow-hidden bg-cream">
                    <ProductImage src={f.image} alt="" fill sizes="260px" className="object-cover transition-transform duration-1000 group-hover:scale-105" />
                  </span>
                  <span className="mt-3 flex items-center justify-between font-display text-lg">
                    {f.title}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
                  </span>
                  <span className="text-xs text-muted">{f.caption}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <Sheet open={mobileOpen} onClose={() => setMobileOpen(false)} side="left" title="Menu">
        <nav aria-label="Mobile" className="px-5 py-2">
          {menus.map((m) => (
            <details key={m.key} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[0.75rem] font-medium uppercase tracking-[0.2em]">
                {m.label}
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" strokeWidth={1.5} />
              </summary>
              <ul className="grid grid-cols-2 gap-1 pb-4">
                {m.items.map((it) => (
                  <li key={it.slug}>
                    <Link href={`${m.base}/${it.slug}`} onClick={() => setMobileOpen(false)} className="block px-2 py-2 font-display text-lg text-charcoal hover:text-gold">{it.name}</Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
          <Link href="/collections/bridal" onClick={() => setMobileOpen(false)} className="group relative mt-5 block aspect-[16/9] overflow-hidden bg-cream">
            <ProductImage src={photoUrl(BRAND_PHOTOS.menuBridal)} alt="" fill sizes="360px" className="object-cover object-[center_25%]" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-4 font-display text-xl text-ivory">The bridal collection</span>
          </Link>
          <div className="space-y-1 py-4 text-sm">
            <Link href="/collections/gifts-for-her" onClick={() => setMobileOpen(false)} className="block py-2">Gifts</Link>
            <Link href="/collections/new-arrivals" onClick={() => setMobileOpen(false)} className="block py-2">New in</Link>
            <Link href={user ? "/account" : "/login"} onClick={() => setMobileOpen(false)} className="block py-2">{user ? "My account" : "Sign in / Register"}</Link>
            <Link href="/track-order" onClick={() => setMobileOpen(false)} className="block py-2">Track order</Link>
            <Link href="/book-consultation" onClick={() => setMobileOpen(false)} className="block py-2">Book a consultation</Link>
            {user?.isStaff && <Link href="/admin" className="block py-2 text-gold">Admin dashboard</Link>}
          </div>
        </nav>
      </Sheet>
    </header>
  );
}
