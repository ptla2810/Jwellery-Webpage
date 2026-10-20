"use client";

import { useState, type MouseEvent } from "react";
import { Expand } from "lucide-react";
import { ProductImage } from "@/components/ui/ProductImage";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";

export function Gallery({ images, name }: { images: { url: string; alt: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const [hovering, setHovering] = useState(false);
  const img = images[active];
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };
  if (!img) return <div className="aspect-[4/5] bg-cream" />;
  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {images.length > 1 && (
        <ul className="scrollbar-none flex gap-2 overflow-x-auto md:w-20 md:flex-col" aria-label="Product images">
          {images.map((im, i) => (
            <li key={im.url} className="shrink-0">
              <button onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} aria-current={i === active} className={cn("relative block aspect-[4/5] w-16 overflow-hidden bg-cream ring-1 transition md:w-20", i === active ? "ring-ink" : "ring-line hover:ring-gold-300")}>
                <ProductImage src={im.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div
        className="group relative aspect-[4/5] flex-1 cursor-zoom-in overflow-hidden bg-cream"
        onMouseMove={onMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={() => setZoom(true)}
      >
        <ProductImage src={img.url} alt={img.alt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover transition-transform duration-200" style={{ transformOrigin: origin, transform: hovering ? "scale(1.8)" : "none" }} />
        <button onClick={(e) => { e.stopPropagation(); setZoom(true); }} className="absolute bottom-3 right-3 flex size-10 items-center justify-center rounded-full bg-white/90 shadow" aria-label="View larger image">
          <Expand className="size-4" />
        </button>
      </div>
      <Sheet open={zoom} onClose={() => setZoom(false)} side="center" title={name} className="max-w-4xl">
        <div className="relative aspect-[4/5] max-h-[75vh] w-full bg-cream">
          <ProductImage src={img.url} alt={img.alt} fill sizes="90vw" className="object-contain" />
        </div>
        {images.length > 1 && (
          <div className="flex justify-center gap-2 p-3">
            {images.map((im, i) => (
              <button key={im.url} onClick={() => setActive(i)} aria-label={`Image ${i + 1}`} className={cn("size-2.5 rounded-full", i === active ? "bg-ink" : "bg-line")} />
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}
