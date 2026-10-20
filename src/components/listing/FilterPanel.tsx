"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import type { Facets, FacetOption } from "@/lib/catalog/queries";
import { CARAT_BANDS, PRICE_BANDS, SORT_OPTIONS } from "@/lib/catalog/labels";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Hide = Partial<Record<"type" | "material" | "occasion", boolean>>;

function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useSearchParams();
  const [pending, start] = useTransition();
  // Optimistic copy of the query so controls respond instantly while the server re-renders results.
  const [optimistic, setOptimistic] = useState<{ base: string; next: string } | null>(null);
  const current = urlParams.toString();
  const sp = new URLSearchParams(optimistic && optimistic.base === current ? optimistic.next : current);
  const push = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    p.delete("page");
    const qs = p.toString();
    setOptimistic({ base: current, next: qs });
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const values = (key: string) => (sp.get(key) ?? "").split(",").filter(Boolean);
  const toggle = (key: string, value: string) =>
    push((p) => {
      const cur = new Set((p.get(key) ?? "").split(",").filter(Boolean));
      if (cur.has(value)) cur.delete(value);
      else cur.add(value);
      if (cur.size) p.set(key, [...cur].join(","));
      else p.delete(key);
    });
  const setRange = (minKey: string, maxKey: string, min: number | null, max: number | null) =>
    push((p) => {
      const same = p.get(minKey) === (min == null ? null : String(min)) && p.get(maxKey) === (max == null ? null : String(max));
      p.delete(minKey);
      p.delete(maxKey);
      if (same) return;
      if (min) p.set(minKey, String(min));
      if (max != null) p.set(maxKey, String(max));
    });
  return { sp, push, values, toggle, setRange, pending };
}

function Group({ title, children, defaultOpen = true, count }: { title: string; children: ReactNode; defaultOpen?: boolean; count?: number }) {
  return (
    <details open={defaultOpen} className="group border-b border-line py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-[0.14em]">
        <span>{title}{count ? <span className="ml-1.5 text-gold">({count})</span> : null}</span>
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 space-y-1">{children}</div>
    </details>
  );
}

function CheckList({ name, options, q }: { name: string; options: FacetOption[]; q: ReturnType<typeof useQueryState> }) {
  const sel = q.values(name);
  return (
    <ul className="max-h-60 space-y-0.5 overflow-y-auto pr-1">
      {options.map((o) => (
        <li key={o.value}>
          <label className={cn("flex cursor-pointer items-center gap-2.5 rounded py-1.5 text-sm", o.count === 0 && !sel.includes(o.value) && "opacity-40")}>
            <input type="checkbox" className="size-4 accent-[var(--color-gold)]" checked={sel.includes(o.value)} onChange={() => q.toggle(name, o.value)} disabled={o.count === 0 && !sel.includes(o.value)} />
            <span className="flex-1">{o.label}</span>
            <span className="text-xs text-muted">{o.count}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

function Filters({ facets, hide, q }: { facets: Facets; hide: Hide; q: ReturnType<typeof useQueryState> }) {
  const priceMin = q.sp.get("priceMin");
  const priceMax = q.sp.get("priceMax");
  const caratMin = q.sp.get("caratMin");
  const caratMax = q.sp.get("caratMax");
  return (
    <div>
      <Group title="Price" count={priceMin || priceMax ? 1 : 0}>
        <ul className="space-y-0.5">
          {PRICE_BANDS.map((b) => {
            const active = (priceMin ?? "0") === String(b.min) && priceMax === (b.max == null ? null : String(b.max));
            const activeOpen = b.max == null && priceMin === String(b.min) && !priceMax;
            return (
              <li key={b.label}>
                <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm">
                  <input type="radio" name="price" className="size-4 accent-[var(--color-gold)]" checked={active || activeOpen} onChange={() => q.setRange("priceMin", "priceMax", b.min || null, b.max)} onClick={() => (active || activeOpen) && q.setRange("priceMin", "priceMax", b.min || null, b.max)} />
                  {b.label}
                </label>
              </li>
            );
          })}
        </ul>
      </Group>
      {!hide.type && facets.type.length > 1 && <Group title="Jewellery type" count={q.values("type").length}><CheckList name="type" options={facets.type} q={q} /></Group>}
      {facets.metal.length > 0 && <Group title="Metal" count={q.values("metal").length}><CheckList name="metal" options={facets.metal} q={q} /></Group>}
      {facets.purity.length > 0 && <Group title="Purity" count={q.values("purity").length}><CheckList name="purity" options={facets.purity} q={q} /></Group>}
      {!hide.material && facets.material.length > 0 && <Group title="Material" count={q.values("material").length} defaultOpen={false}><CheckList name="material" options={facets.material} q={q} /></Group>}
      {facets.hasDiamonds && (
        <Group title="Diamond" count={q.values("clarity").length + (caratMin || caratMax ? 1 : 0)} defaultOpen={false}>
          <p className="pt-1 text-[0.68rem] uppercase tracking-[0.12em] text-muted">Clarity</p>
          <CheckList name="clarity" options={facets.clarity} q={q} />
          <p className="pt-3 text-[0.68rem] uppercase tracking-[0.12em] text-muted">Total carat weight</p>
          <ul>
            {CARAT_BANDS.map((b) => {
              const active = (caratMin ?? "0") === String(b.min) && caratMax === (b.max == null ? null : String(b.max));
              return (
                <li key={b.label}>
                  <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm">
                    <input type="checkbox" className="size-4 accent-[var(--color-gold)]" checked={active} onChange={() => q.setRange("caratMin", "caratMax", b.min || null, b.max)} />
                    {b.label}
                  </label>
                </li>
              );
            })}
          </ul>
        </Group>
      )}
      {facets.gemstone.length > 0 && <Group title="Gemstone" count={q.values("gemstone").length} defaultOpen={false}><CheckList name="gemstone" options={facets.gemstone} q={q} /></Group>}
      {!hide.occasion && facets.occasion.length > 0 && <Group title="Occasion" count={q.values("occasion").length} defaultOpen={false}><CheckList name="occasion" options={facets.occasion} q={q} /></Group>}
      {facets.style.length > 0 && <Group title="Style" count={q.values("style").length} defaultOpen={false}><CheckList name="style" options={facets.style} q={q} /></Group>}
      {facets.size.length > 0 && <Group title="Size" count={q.values("size").length} defaultOpen={false}><CheckList name="size" options={facets.size} q={q} /></Group>}
      <Group title="More">
        <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--color-gold)]" checked={q.sp.get("availability") === "in-stock"} onChange={() => q.push((p) => (p.get("availability") ? p.delete("availability") : p.set("availability", "in-stock")))} />
          In stock only
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--color-gold)]" checked={q.sp.get("discount") === "1"} onChange={() => q.push((p) => (p.get("discount") ? p.delete("discount") : p.set("discount", "1")))} />
          On offer
        </label>
      </Group>
    </div>
  );
}

export function SortSelect() {
  const q = useQueryState();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted sm:inline">Sort by</span>
      <select
        aria-label="Sort products"
        value={q.sp.get("sort") ?? "popular"}
        onChange={(e) => q.push((p) => (e.target.value === "popular" ? p.delete("sort") : p.set("sort", e.target.value)))}
        className="h-10 cursor-pointer border border-line bg-white px-3 pr-8 text-sm focus:border-gold focus:outline-none"
        data-testid="sort-select"
      >
        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function FilterSidebar({ facets, hide = {} }: { facets: Facets; hide?: Hide }) {
  const q = useQueryState();
  return (
    <aside aria-label="Filters" className={cn("hidden lg:block", q.pending && "opacity-60")}>
      <Filters facets={facets} hide={hide} q={q} />
    </aside>
  );
}

export function MobileFilters({ facets, hide = {}, total }: { facets: Facets; hide?: Hide; total: number }) {
  const q = useQueryState();
  const [open, setOpen] = useState(false);
  const activeCount = [...q.sp.keys()].filter((k) => !["sort", "page", "q"].includes(k)).length;
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex h-10 items-center gap-2 border border-line bg-white px-4 text-sm lg:hidden" data-testid="mobile-filter-button">
        <SlidersHorizontal className="size-4" /> Filters {activeCount > 0 && <span className="rounded-full bg-ink px-1.5 text-xs text-ivory">{activeCount}</span>}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} side="left" title="Filters" footer={<Button className="w-full" onClick={() => setOpen(false)} loading={q.pending}>Show {total} results</Button>}>
        <div className="px-5"><Filters facets={facets} hide={hide} q={q} /></div>
      </Sheet>
    </>
  );
}

export function ActiveFilterChips({ labels }: { labels: Record<string, Record<string, string>> }) {
  const q = useQueryState();
  const chips: { key: string; value: string; label: string }[] = [];
  for (const key of ["type", "material", "occasion", "metal", "purity", "gemstone", "clarity", "style", "size"]) {
    for (const v of q.values(key)) chips.push({ key, value: v, label: labels[key]?.[v] ?? v });
  }
  const pmin = q.sp.get("priceMin");
  const pmax = q.sp.get("priceMax");
  if (pmin || pmax) chips.push({ key: "price", value: "", label: `₹${Number(pmin ?? 0).toLocaleString("en-IN")} – ${pmax ? `₹${Number(pmax).toLocaleString("en-IN")}` : "above"}` });
  const cmin = q.sp.get("caratMin");
  const cmax = q.sp.get("caratMax");
  if (cmin || cmax) chips.push({ key: "carat", value: "", label: `${cmin ?? 0} – ${cmax ?? "+"} ct` });
  if (q.sp.get("availability")) chips.push({ key: "availability", value: "", label: "In stock" });
  if (q.sp.get("discount")) chips.push({ key: "discount", value: "", label: "On offer" });
  if (!chips.length) return null;
  const remove = (c: (typeof chips)[number]) => {
    if (c.key === "price") return q.push((p) => { p.delete("priceMin"); p.delete("priceMax"); });
    if (c.key === "carat") return q.push((p) => { p.delete("caratMin"); p.delete("caratMax"); });
    if (c.key === "availability" || c.key === "discount") return q.push((p) => p.delete(c.key));
    q.toggle(c.key, c.value);
  };
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="active-filters">
      {chips.map((c) => (
        <button key={`${c.key}-${c.value}`} onClick={() => remove(c)} className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-xs hover:border-ink" aria-label={`Remove filter ${c.label}`}>
          {c.label} <X className="size-3" />
        </button>
      ))}
      <button
        onClick={() => q.push((p) => { for (const k of [...p.keys()]) if (!["q", "sort"].includes(k)) p.delete(k); })}
        className="text-xs font-semibold uppercase tracking-[0.12em] text-gold underline-offset-4 hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
