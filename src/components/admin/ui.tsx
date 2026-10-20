import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && <Link href={back.href} className="mb-1 inline-block text-xs text-muted hover:text-ink">← {back.label}</Link>}
        <h1 className="font-sans text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-[var(--radius-md)] border border-line bg-white p-5", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.08em] text-charcoal">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, href }: { label: string; value: ReactNode; hint?: ReactNode; href?: string }) {
  const inner = (
    <>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-[var(--radius-md)] border border-line bg-white p-5 transition-colors hover:border-gold">{inner}</Link>
  ) : (
    <div className="rounded-[var(--radius-md)] border border-line bg-white p-5">{inner}</div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-[var(--radius-md)] border border-line bg-white", className)}>
      <table className="w-full text-left text-sm [&_td]:border-t [&_td]:border-line [&_td]:px-4 [&_td]:py-3 [&_th]:whitespace-nowrap [&_th]:bg-cream/60 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.06em] [&_th]:text-muted">
        {children}
      </table>
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "info" }) {
  const tones = { neutral: "bg-cream text-charcoal", good: "bg-success/10 text-success", warn: "bg-gold-100 text-gold", bad: "bg-danger/10 text-danger", info: "bg-[#e8eef7] text-[#2c4a74]" };
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

/** GET search/filter bar — keeps state in the URL so views are shareable. */
export function FilterBar({ children, action }: { children: ReactNode; action: string }) {
  return (
    <form action={action} method="get" className="mb-4 flex flex-wrap items-end gap-2">
      {children}
      <button className="h-9 rounded-[var(--radius-sm)] bg-ink px-4 text-xs font-semibold uppercase tracking-[0.1em] text-ivory">Apply</button>
      <Link href={action} className="h-9 px-2 text-xs leading-9 text-muted hover:text-ink">Reset</Link>
    </form>
  );
}

export const fieldCls = "h-9 rounded-[var(--radius-sm)] border border-line bg-white px-3 text-sm focus:border-gold focus:outline-none";

export function AdminPagination({ page, pageCount, base, params }: { page: number; pageCount: number; base: string; params: Record<string, string | undefined> }) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries({ ...params, page: String(p) }).filter(([, v]) => v) as [string, string][]);
    return `${base}?${q}`;
  };
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted">Page {page} of {pageCount}</span>
      <div className="flex gap-2">
        {page > 1 && <Link className="rounded border border-line bg-white px-3 py-1.5 hover:border-ink" href={href(page - 1)}>Previous</Link>}
        {page < pageCount && <Link className="rounded border border-line bg-white px-3 py-1.5 hover:border-ink" href={href(page + 1)}>Next</Link>}
      </div>
    </div>
  );
}

export function sp(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function statusTone(s: string): "good" | "bad" | "neutral" | "info" | "warn" {
  return s === "DELIVERED" ? "good" : s === "CANCELLED" || s === "PAYMENT_FAILED" ? "bad" : s === "PENDING_PAYMENT" ? "neutral" : s === "SHIPPED" ? "info" : "warn";
}
