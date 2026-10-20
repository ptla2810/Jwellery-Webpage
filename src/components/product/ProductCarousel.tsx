"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductCard as Card } from "@/lib/catalog/queries";
import { ProductCard } from "./ProductCard";

export function ProductCarousel({ products, label }: { products: Card[]; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label={label}>
      <div ref={track} className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 md:mx-0 md:gap-6 md:px-0">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} className="w-[62%] shrink-0 snap-start sm:w-[40%] md:w-[30%] lg:w-[23%]" />
        ))}
      </div>
      <div className="mt-6 hidden justify-end gap-2 md:flex">
        <button onClick={() => scroll(-1)} className="flex size-10 items-center justify-center rounded-full border border-line hover:border-ink" aria-label="Previous products"><ChevronLeft className="size-4" /></button>
        <button onClick={() => scroll(1)} className="flex size-10 items-center justify-center rounded-full border border-line hover:border-ink" aria-label="Next products"><ChevronRight className="size-4" /></button>
      </div>
    </div>
  );
}
