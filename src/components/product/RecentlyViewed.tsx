"use client";

import { useEffect, useState } from "react";
import { recentlyViewedAction } from "@/app/actions/engagement";
import type { ProductCard as Card } from "@/lib/catalog/queries";
import { ProductCarousel } from "./ProductCarousel";

const KEY = "aurelle:recently-viewed";

export function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
  const [items, setItems] = useState<Card[]>([]);
  useEffect(() => {
    let list: string[] = [];
    try {
      list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {}
    const others = list.filter((s) => s !== currentSlug).slice(0, 8);
    try {
      localStorage.setItem(KEY, JSON.stringify([currentSlug, ...others].slice(0, 12)));
    } catch {}
    if (others.length) recentlyViewedAction(others).then(setItems).catch(() => {});
  }, [currentSlug]);
  if (!items.length) return null;
  return (
    <section className="container-x py-16" aria-labelledby="rv-heading">
      <h2 id="rv-heading" className="mb-8 text-3xl">Recently viewed</h2>
      <ProductCarousel products={items} label="Recently viewed" />
    </section>
  );
}
