"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/account", label: "Profile" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/cart", label: "Saved bag" },
  { href: "/account/support", label: "Support requests" },
];

export function AccountNav() {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      {LINKS.map((l) => {
        const active = l.href === "/account" ? path === "/account" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={cn("shrink-0 rounded-[var(--radius-sm)] px-3 py-2 text-sm", active ? "bg-ink text-ivory" : "hover:bg-cream")}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
