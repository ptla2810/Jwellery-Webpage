"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Clock, X } from "lucide-react";
import { formatINR } from "@/lib/money";
import { ProductImage } from "@/components/ui/ProductImage";

type Suggestions = {
  products: { slug: string; name: string; price: number; sku: string; image: { url: string; alt: string } | null }[];
  categories: { slug: string; name: string }[];
  collections: { slug: string; name: string }[];
};

const RECENT_KEY = "aurelle:recent-searches";
function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]").slice(0, 5);
  } catch {
    return [];
  }
}
export function rememberSearch(q: string) {
  try {
    const list = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}

export function SearchBox({ autoFocus, onDone, initial = "" }: { autoFocus?: boolean; onDone?: () => void; initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Suggestions | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const wrap = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setData(d))
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (term: string) => {
    const t = term.trim();
    if (!t) return;
    rememberSearch(t);
    setOpen(false);
    onDone?.();
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };
  const done = () => {
    setOpen(false);
    onDone?.();
  };

  const hasResults = data && (data.products.length || data.categories.length || data.collections.length);
  return (
    <div ref={wrap} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="flex items-center gap-2 border-b border-line bg-transparent focus-within:border-gold"
      >
        <Search className="size-4 shrink-0 text-muted" aria-hidden />
        <label htmlFor={`${listId}-input`} className="sr-only">Search jewellery</label>
        <input
          id={`${listId}-input`}
          type="search"
          name="q"
          value={q}
          autoFocus={autoFocus}
          autoComplete="off"
          onFocus={() => {
            setRecent(readRecent());
            setOpen(true);
          }}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Search rings, SKU, diamonds…"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          className="h-10 w-full bg-transparent text-sm placeholder:text-muted/80 focus:outline-none focus-visible:outline-none"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="text-muted hover:text-ink">
            <X className="size-4" />
          </button>
        )}
      </form>
      {open && (q.trim().length >= 2 || recent.length > 0) && (
        <div id={listId} className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-[var(--radius-md)] border border-line bg-white p-3 shadow-xl md:min-w-[26rem]">
          {q.trim().length < 2 ? (
            <div>
              <p className="eyebrow mb-2 px-2">Recent searches</p>
              {recent.map((r) => (
                <button key={r} onClick={() => go(r)} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-cream">
                  <Clock className="size-3.5 text-muted" /> {r}
                </button>
              ))}
            </div>
          ) : !data ? (
            <p className="px-2 py-3 text-sm text-muted">Searching…</p>
          ) : !hasResults ? (
            <p className="px-2 py-3 text-sm text-muted">No matches for “{q}”. Press Enter to see suggestions.</p>
          ) : (
            <div className="space-y-3">
              {data.products.length > 0 && (
                <ul>
                  {data.products.map((p) => (
                    <li key={p.slug}>
                      <Link href={`/products/${p.slug}`} onClick={done} className="flex items-center gap-3 rounded px-2 py-2 hover:bg-cream">
                        <span className="relative size-12 shrink-0 overflow-hidden bg-cream">
                          {p.image && <ProductImage src={p.image.url} alt="" fill sizes="48px" className="object-cover" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{p.name}</span>
                          <span className="block text-xs text-muted">{p.sku}</span>
                        </span>
                        <span className="text-sm font-medium">{formatINR(p.price)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {(data.categories.length > 0 || data.collections.length > 0) && (
                <div className="flex flex-wrap gap-2 border-t border-line px-2 pt-3">
                  {data.categories.map((c) => (
                    <Link key={c.slug} href={`/jewellery/${c.slug}`} onClick={done} className="rounded-full border border-line px-3 py-1 text-xs hover:border-gold">{c.name}</Link>
                  ))}
                  {data.collections.map((c) => (
                    <Link key={c.slug} href={`/collections/${c.slug}`} onClick={done} className="rounded-full border border-line px-3 py-1 text-xs hover:border-gold">{c.name}</Link>
                  ))}
                </div>
              )}
              <button onClick={() => go(q)} className="w-full border-t border-line px-2 pt-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-gold hover:underline">
                See all results for “{q}”
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
