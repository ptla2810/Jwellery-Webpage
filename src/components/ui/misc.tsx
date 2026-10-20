import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/money";

export function Price({ price, compareAt, className, size = "md" }: { price: number; compareAt?: number | null; className?: string; size?: "sm" | "md" | "lg" }) {
  const off = compareAt && compareAt > price ? Math.floor(((compareAt - price) / compareAt) * 100) : 0;
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span data-testid="price" className={cn("font-semibold text-ink", size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base")}>{formatINR(price)}</span>
      {off > 0 && (
        <>
          <span className={cn("text-muted line-through", size === "lg" ? "text-base" : "text-xs")}>
            <span className="sr-only">Original price </span>
            {formatINR(compareAt!)}
          </span>
          <span className={cn("font-semibold text-wine", size === "lg" ? "text-sm" : "text-xs")}>{off}% off</span>
        </>
      )}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "gold" | "wine" | "success" | "danger" | "dark"; className?: string }) {
  const tones = {
    neutral: "bg-cream text-charcoal",
    gold: "bg-gold-100 text-gold",
    wine: "bg-wine text-white",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
    dark: "bg-ink text-ivory",
  };
  return <span className={cn("inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em]", tones[tone], className)}>{children}</span>;
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {it.href && i < items.length - 1 ? (
              <Link href={it.href} className="hover:text-ink">{it.label}</Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className="text-charcoal">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-md)] border border-dashed border-line bg-white/60 px-6 py-16 text-center">
      {icon && <div className="text-gold-500">{icon}</div>}
      <h2 className="font-display text-2xl">{title}</h2>
      {body && <div className="max-w-md text-sm text-muted">{body}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Pagination({ page, pageCount, href }: { page: number; pageCount: number; href: (p: number) => string }) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1);
  const item = "inline-flex size-10 items-center justify-center rounded-[var(--radius-sm)] text-sm";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(item, "hover:bg-cream")} aria-label="Previous page"><ChevronLeft className="size-4" /></Link>
      ) : (
        <span className={cn(item, "text-muted/40")} aria-hidden><ChevronLeft className="size-4" /></span>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-muted">…</span>}
          <Link href={href(p)} aria-current={p === page ? "page" : undefined} className={cn(item, p === page ? "bg-ink text-ivory" : "hover:bg-cream")}>{p}</Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link href={href(page + 1)} className={cn(item, "hover:bg-cream")} aria-label="Next page"><ChevronRight className="size-4" /></Link>
      ) : (
        <span className={cn(item, "text-muted/40")} aria-hidden><ChevronRight className="size-4" /></span>
      )}
    </nav>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[var(--radius-sm)] bg-sand/60", className)} />;
}

export function SectionHeading({ eyebrow, title, action, className, align = "left" }: { eyebrow?: string; title: string; action?: ReactNode; className?: string; align?: "left" | "center" }) {
  return (
    <div className={cn("mb-8 flex flex-col gap-3 md:mb-10", align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between", className)}>
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="text-3xl leading-tight md:text-[2.6rem]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Stars({ value, count, className }: { value: number; count?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted", className)}>
      <span className="relative inline-block text-[0.8rem] leading-none tracking-[0.1em]" aria-label={`Rated ${value.toFixed(1)} out of 5`} role="img">
        <span className="text-sand">★★★★★</span>
        <span className="absolute inset-0 overflow-hidden text-gold-500" style={{ width: `${pct}%` }}>★★★★★</span>
      </span>
      {count != null && <span>({count})</span>}
    </span>
  );
}
