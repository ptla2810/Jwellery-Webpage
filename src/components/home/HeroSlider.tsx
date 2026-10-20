"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductImage } from "@/components/ui/ProductImage";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Slide = { id: string; eyebrow: string | null; title: string; subtitle: string | null; ctaLabel: string | null; ctaHref: string | null; imageUrl: string; imageAlt: string };

export function HeroSlider({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length, paused]);
  if (!slides.length) return null;
  const dark = (s: Slide) => !/hero-2|ivory|blush/.test(s.imageUrl);
  return (
    <section aria-roledescription="carousel" aria-label="Featured" className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="relative h-[78vh] min-h-[520px] max-h-[760px] overflow-hidden bg-ink">
        {slides.map((s, idx) => (
          <div key={s.id} role="group" aria-roledescription="slide" aria-label={`${idx + 1} of ${slides.length}`} aria-hidden={idx !== i} className={cn("absolute inset-0 transition-opacity duration-1000", idx === i ? "opacity-100" : "pointer-events-none opacity-0")}>
            <ProductImage src={s.imageUrl} alt={s.imageAlt} fill priority={idx === 0} sizes="100vw" className={cn("object-cover object-[70%_center] transition-transform duration-[8000ms]", idx === i && "scale-[1.04]")} />
            <div className={cn("absolute inset-0", dark(s) ? "bg-ink/55 md:bg-transparent md:bg-gradient-to-r md:from-ink/70 md:via-ink/25 md:to-transparent" : "bg-ivory/70 md:bg-transparent md:bg-gradient-to-r md:from-ivory/85 md:via-ivory/40 md:to-transparent")} />
            <div className="container-x relative flex h-full items-center">
              <div className={cn("max-w-xl", idx === i && "animate-fade-up", dark(s) ? "text-ivory" : "text-ink")}>
                {s.eyebrow && <p className={cn("eyebrow mb-4", dark(s) && "text-gold-300")}>{s.eyebrow}</p>}
                <h1 className="text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-7xl">{s.title}</h1>
                {s.subtitle && <p className={cn("mt-5 max-w-md text-base leading-relaxed", dark(s) ? "text-ivory/80" : "text-charcoal")}>{s.subtitle}</p>}
                {s.ctaHref && (
                  <Link href={s.ctaHref} tabIndex={idx === i ? 0 : -1} className={cn(buttonClass(dark(s) ? "gold" : "primary", "lg"), "mt-8")}>
                    {s.ctaLabel ?? "Shop now"}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="container-x absolute inset-x-0 bottom-6 flex items-center justify-between">
          <div className="flex gap-2">
            {slides.map((s, idx) => (
              <button key={s.id} onClick={() => setI(idx)} aria-label={`Show slide ${idx + 1}`} aria-current={idx === i} className={cn("h-0.5 transition-all", idx === i ? "w-10 bg-gold-300" : "w-5 bg-ivory/50 hover:bg-ivory")} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setI((i - 1 + slides.length) % slides.length)} aria-label="Previous slide" className="flex size-10 items-center justify-center rounded-full border border-ivory/40 text-ivory backdrop-blur hover:bg-ivory/10"><ChevronLeft className="size-4" /></button>
            <button onClick={() => setI((i + 1) % slides.length)} aria-label="Next slide" className="flex size-10 items-center justify-center rounded-full border border-ivory/40 text-ivory backdrop-blur hover:bg-ivory/10"><ChevronRight className="size-4" /></button>
          </div>
        </div>
      )}
    </section>
  );
}
