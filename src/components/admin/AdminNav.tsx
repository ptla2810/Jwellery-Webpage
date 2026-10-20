"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, Boxes, ClipboardList, FileText, FolderTree, Gem, Image as ImageIcon, LayoutGrid, Megaphone, Menu, MessageSquare, RotateCcw, Settings, Shield, Star, Tag, Users, Warehouse, X, History,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: BarChart3, perm: "admin.access" },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList, perm: "orders.read" },
  { href: "/admin/returns", label: "Returns", icon: RotateCcw, perm: "orders.read" },
  { href: "/admin/products", label: "Products", icon: Gem, perm: "products.read" },
  { href: "/admin/inventory", label: "Inventory", icon: Warehouse, perm: "products.read" },
  { href: "/admin/categories", label: "Categories", icon: FolderTree, perm: "catalog.write" },
  { href: "/admin/collections", label: "Collections", icon: LayoutGrid, perm: "catalog.write" },
  { href: "/admin/customers", label: "Customers", icon: Users, perm: "customers.read" },
  { href: "/admin/reviews", label: "Reviews", icon: Star, perm: "reviews.write" },
  { href: "/admin/support", label: "Support", icon: MessageSquare, perm: "support.write" },
  { href: "/admin/coupons", label: "Coupons", icon: Tag, perm: "marketing.write" },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon, perm: "marketing.write" },
  { href: "/admin/promotions", label: "Promotions", icon: Megaphone, perm: "marketing.write" },
  { href: "/admin/pages", label: "Content pages", icon: FileText, perm: "content.write" },
  { href: "/admin/settings", label: "Settings", icon: Settings, perm: "settings.write" },
  { href: "/admin/staff", label: "Staff & roles", icon: Shield, perm: "staff.write" },
  { href: "/admin/audit", label: "Audit log", icon: History, perm: "audit.read" },
] as const;

export function AdminNav({ permissions, storeName, userName }: { permissions: string[]; storeName: string; userName: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const items = ITEMS.filter((i) => permissions.includes(i.perm));
  const nav = (
    <nav aria-label="Admin" className="space-y-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm", active ? "bg-ink text-ivory" : "text-charcoal hover:bg-cream")}>
            <Icon className="size-4" strokeWidth={1.7} /> {label}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <>
      <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <span className="font-display text-xl">{storeName} <span className="font-sans text-xs text-muted">Admin</span></span>
        <button onClick={() => setOpen(!open)} aria-label="Toggle admin menu" aria-expanded={open}>{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
      </div>
      {open && <div className="border-b border-line bg-white p-3 lg:hidden">{nav}</div>}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-white p-4 lg:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-2 px-3"><Boxes className="size-5 text-gold" /><span className="font-display text-xl">{storeName}</span></Link>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="border-t border-line px-3 pt-3 text-xs text-muted">
          <p className="truncate">{userName}</p>
          <Link href="/" className="mt-1 inline-block text-gold hover:underline">View store →</Link>
        </div>
      </aside>
    </>
  );
}
