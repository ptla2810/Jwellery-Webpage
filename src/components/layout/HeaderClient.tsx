"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import type { Navigation } from "@/lib/catalog/queries";
import { useStore } from "@/components/providers/StoreProvider";
import { Sheet } from "@/components/ui/Sheet";
import { ProductImage } from "@/components/ui/ProductImage";
import { cn } from "@/lib/cn";
import { SearchBox } from "./SearchBox";

type MenuKey = "jewellery" | "metal" | "occasion" | "collections";

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

  const menus: { key: MenuKey; label: string; items: Navigation["types"]; base: string; feature: { title: string; href: string; image: string } }[] = [
    { key: "jewellery", label: "Jewellery", items: nav.types, base: "/jewellery", feature: { title: "Best sellers", href: "/collections/best-sellers", image: "/images/collections/best-sellers.svg" } },
    { key: "metal", label: "Gold & Diamonds", items: nav.materials, base: "/jewellery", feature: { title: "The Diamond Room", href: "/jewellery/diamond", image: "/images/categories/diamond.svg" } },
    { key: "occasion", label: "Occasions", items: nav.occasions, base: "/jewellery", feature: { title: "Wedding jewellery", href: "/jewellery/wedding", image: "/images/categories/wedding.svg" } },
    { key: "collections", label: "Collections", items: nav.collections, base: "/collections", feature: { title: "Bridal collection", href: "/collections/bridal", image: "/images/collections/bridal.svg" } },
  ];
  const active = menus.find((m) => m.key === menu);

  const enter = (k: MenuKey) => {
    clearTimeout(closeTimer.current);
    setMenu(k);
  };
  const leave = () => {
    closeTimer.current = setTimeout(() => setMenu(null), 120);
  };

  const iconBtn = "relative inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-cream";

  return (
    <header className={cn("sticky top-0 z-40 border-b bg-ivory/95 backdrop-blur transition-shadow", scrolled ? "border-line shadow-[0_6px_24px_-18px_rgba(31,28,25,0.35)]" : "border-transparent")}>
      <div className="container-x flex h-16 items-center gap-3 md:h-20">
        <button className={cn(iconBtn, "lg:hidden")} onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu className="size-5" />
        </button>
        <Link href="/" className="flex shrink-0 flex-col items-start leading-none" aria-label={`${storeName} home`}>
          <span className="font-display text-[1.65rem] tracking-[0.04em] md:text-[1.9rem]">{storeName.split(" ")[0]}</span>
          <span className="hidden text-[0.55rem] font-semibold uppercase tracking-[0.42em] text-gold sm:block">{storeName.split(" ").slice(1).join(" ") || "Fine Jewellery"}</span>
        </Link>

        <nav aria-label="Main" className="ml-8 hidden h-full items-stretch lg:flex" onMouseLeave={leave}>
          {menus.map((m) => (
            <div key={m.key} className="flex items-stretch" onMouseEnter={() => enter(m.key)}>
              <button
                className={cn("flex items-center gap-1 px-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] transition-colors", menu === m.key ? "text-gold" : "text-charcoal hover:text-gold")}
                aria-expanded={menu === m.key}
                aria-haspopup="true"
                onClick={() => setMenu(menu === m.key ? null : m.key)}
                onKeyDown={(e) => e.key === "Escape" && setMenu(null)}
              >
                {m.label}
                <ChevronDown className={cn("size-3 transition-transform", menu === m.key && "rotate-180")} />
              </button>
            </div>
          ))}
          <Link href="/collections/bridal" className="flex items-center px-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-charcoal hover:text-gold">Bridal</Link>
          <Link href="/collections/gifts-for-her" className="flex items-center px-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-charcoal hover:text-gold">Gifts</Link>
        </nav>

        <div className="ml-auto hidden w-64 xl:block">
          <SearchBox />
        </div>
        <div className="ml-auto flex items-center gap-0.5 xl:ml-4">
          <button className={cn(iconBtn, "xl:hidden")} onClick={() => setSearchOpen((s) => !s)} aria-label="Search" aria-expanded={searchOpen}>
            {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
          </button>
          <Link href={user ? "/account" : "/login"} className={cn(iconBtn, "hidden sm:inline-flex")} aria-label={user ? `Account (${user.name})` : "Sign in"}>
            <User className="size-5" />
          </Link>
          <Link href="/wishlist" className={iconBtn} aria-label={`Wishlist (${wishlist.size} items)`}>
            <Heart className="size-5" />
            {wishlist.size > 0 && <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-gold text-[0.6rem] font-semibold text-white">{wishlist.size}</span>}
          </Link>
          <button className={iconBtn} onClick={openDrawer} aria-label={`Shopping bag (${cartCount} items)`} data-testid="cart-button">
            <ShoppingBag className="size-5" />
            {cartCount > 0 && <span data-testid="cart-count" className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-ink text-[0.6rem] font-semibold text-ivory">{cartCount}</span>}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="container-x animate-fade pb-4 xl:hidden">
          <SearchBox autoFocus onDone={() => setSearchOpen(false)} />
        </div>
      )}

      {active && (
        <div className="absolute inset-x-0 top-full hidden animate-fade border-t border-line bg-ivory shadow-[0_24px_40px_-30px_rgba(31,28,25,0.45)] lg:block" onMouseEnter={() => enter(active.key)} onMouseLeave={leave}>
          <div className="container-x grid grid-cols-[1fr_280px] gap-10 py-10">
            <div>
              <p className="eyebrow mb-5">Shop by {active.label.toLowerCase()}</p>
              <ul className="grid grid-cols-3 gap-x-8 gap-y-1 xl:grid-cols-4">
                {active.items.map((it) => (
                  <li key={it.slug}>
                    <Link href={`${active.base}/${it.slug}`} className="group flex items-center gap-3 rounded py-2 text-sm text-charcoal hover:text-gold">
                      {it.imageUrl && (
                        <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-cream">
                          <ProductImage src={it.imageUrl} alt="" fill sizes="40px" className="object-cover transition-transform group-hover:scale-110" />
                        </span>
                      )}
                      {it.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={active.key === "collections" ? "/collections" : "/shop"} className="mt-6 inline-block text-xs font-semibold uppercase tracking-[0.14em] text-gold hover:underline">
                View all →
              </Link>
            </div>
            <Link href={active.feature.href} className="group relative block aspect-[4/5] overflow-hidden bg-cream">
              <ProductImage src={active.feature.image} alt="" fill sizes="280px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-5 font-display text-xl text-ivory">{active.feature.title}</span>
            </Link>
          </div>
        </div>
      )}

      <Sheet open={mobileOpen} onClose={() => setMobileOpen(false)} side="left" title="Menu">
        <nav aria-label="Mobile" className="px-5 py-2">
          {menus.map((m) => (
            <details key={m.key} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-semibold uppercase tracking-[0.14em]">
                {m.label}
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="grid grid-cols-2 gap-1 pb-4">
                {m.items.map((it) => (
                  <li key={it.slug}>
                    <Link href={`${m.base}/${it.slug}`} onClick={() => setMobileOpen(false)} className="block rounded px-2 py-2 text-sm text-charcoal hover:bg-cream">{it.name}</Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
          <div className="space-y-1 py-4 text-sm">
            <Link href="/collections/bridal" onClick={() => setMobileOpen(false)} className="block py-2">Bridal</Link>
            <Link href="/collections/gifts-for-her" onClick={() => setMobileOpen(false)} className="block py-2">Gifts</Link>
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
