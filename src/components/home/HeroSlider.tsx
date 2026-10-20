"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductImage } from "@/components/ui/ProductImage";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Slide = { id: string; eyebrow: string | null; title: string; subtitle: string | null; ctaLabel: string | null; ctaHref: string | null; imageUrl: string; imageAlt: string };

/** Editorial split hero: copy on a quiet panel beside a full-height photograph (photo with overlaid copy on mobile). */
export function HeroSlider({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [slides.length, paused]);
  if (!slides.length) return null;
  const go = (d: 1 | -1) => setI((i + d + slides.length) % slides.length);
  return (
    <section aria-roledescription="carousel" aria-label="Featured" className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="relative h-[82svh] min-h-[540px] max-h-[820px] overflow-hidden bg-cream">
        {slides.map((s, idx) => (
          <div
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${idx + 1} of ${slides.length}`}
            aria-hidden={idx !== i}
            className={cn("absolute inset-0 transition-opacity duration-1000 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]", idx === i ? "opacity-100" : "pointer-events-none opacity-0")}
          >
            <div className="absolute inset-0 overflow-hidden md:relative md:order-2">
              <ProductImage src={s.imageUrl} alt={s.imageAlt} fill priority={idx === 0} sizes="(min-width:768px) 60vw, 100vw" className={cn("object-cover object-[center_25%] transition-transform duration-[9000ms] ease-out", idx === i ? "scale-[1.05]" : "scale-100")} />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/15 to-transparent md:hidden" />
            </div>
            <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-20 text-ivory md:relative md:order-1 md:flex md:items-center md:px-12 md:pb-0 md:text-ink lg:px-20">
              <div className={cn("max-w-md", idx === i && "animate-fade-up")}>
                {s.eyebrow && <p className="eyebrow mb-5 text-gold-300 md:text-gold">{s.eyebrow}</p>}
                <h1 className="text-[2.5rem] leading-[1.04] sm:text-5xl lg:text-[4.2rem]">{s.title}</h1>
                {s.subtitle && <p className="mt-5 text-[0.95rem] leading-relaxed text-ivory/85 md:text-charcoal/80">{s.subtitle}</p>}
                {s.ctaHref && (
                  <Link href={s.ctaHref} tabIndex={idx === i ? 0 : -1} className={cn(buttonClass("light", "lg"), "mt-9 md:bg-ink md:text-ivory md:hover:bg-charcoal")}>
                    {s.ctaLabel ?? "Shop now"}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-6 z-20 flex items-center justify-between px-6 md:w-[41.67%] md:px-12 lg:px-20">
          <div className="flex items-center gap-3 text-xs tabular-nums text-ivory md:text-charcoal">
            <span>{String(i + 1).padStart(2, "0")}</span>
            <div className="flex gap-1.5">
              {slides.map((s, idx) => (
                <button key={s.id} onClick={() => setI(idx)} aria-label={`Show slide ${idx + 1}`} aria-current={idx === i} className={cn("h-px transition-all", idx === i ? "w-10 bg-ivory md:bg-ink" : "w-5 bg-ivory/50 hover:bg-ivory md:bg-ink/25 md:hover:bg-ink/60")} />
              ))}
            </div>
            <span className="opacity-60">{String(slides.length).padStart(2, "0")}</span>
          </div>
          <div className="flex gap-1">
            <button onClick={() => go(-1)} aria-label="Previous slide" className="flex size-10 items-center justify-center text-ivory transition-colors hover:text-gold-300 md:text-ink md:hover:text-gold"><ChevronLeft className="size-5" strokeWidth={1.25} /></button>
            <button onClick={() => go(1)} aria-label="Next slide" className="flex size-10 items-center justify-center text-ivory transition-colors hover:text-gold-300 md:text-ink md:hover:text-gold"><ChevronRight className="size-5" strokeWidth={1.25} /></button>
          </div>
        </div>
      )}
    </section>
  );
}
