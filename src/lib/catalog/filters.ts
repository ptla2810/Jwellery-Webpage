import { MetalType, Prisma } from "@prisma/client";
import { SORT_OPTIONS, type SortValue } from "./labels";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? v.split(",") : []).map((s) => s.trim()).filter(Boolean).slice(0, 20);

const num = (v: string | string[] | undefined) => {
  const s = Array.isArray(v) ? v[0] : v;
  if (s == null || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export type ListingFilters = {
  q?: string;
  type: string[]; // category slugs (TYPE)
  material: string[]; // category slugs (MATERIAL)
  occasion: string[]; // category slugs (OCCASION)
  metal: MetalType[];
  purity: string[];
  gemstone: string[];
  clarity: string[];
  style: string[];
  size: string[];
  priceMin?: number; // rupees
  priceMax?: number;
  caratMin?: number;
  caratMax?: number;
  inStock: boolean;
  onSale: boolean;
  sort: SortValue;
  page: number;
};

export function parseFilters(sp: SearchParamsRecord): ListingFilters {
  const sortRaw = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort = (SORT_OPTIONS.find((o) => o.value === sortRaw)?.value ?? "popular") as SortValue;
  const metalValues = Object.values(MetalType) as string[];
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 80);
  const page = Math.max(1, Math.min(500, Math.floor(num(sp.page) ?? 1)));
  return {
    q: q || undefined,
    type: list(sp.type),
    material: list(sp.material),
    occasion: list(sp.occasion),
    metal: list(sp.metal).filter((m) => metalValues.includes(m)) as MetalType[],
    purity: list(sp.purity),
    gemstone: list(sp.gemstone),
    clarity: list(sp.clarity),
    style: list(sp.style),
    size: list(sp.size),
    priceMin: num(sp.priceMin),
    priceMax: num(sp.priceMax),
    caratMin: num(sp.caratMin),
    caratMax: num(sp.caratMax),
    inStock: (Array.isArray(sp.availability) ? sp.availability[0] : sp.availability) === "in-stock",
    onSale: (Array.isArray(sp.discount) ? sp.discount[0] : sp.discount) === "1",
    sort,
    page,
  };
}

/** Text search across name, SKUs, categories, collections and key attributes (case-insensitive). */
export function searchWhere(q: string): Prisma.ProductWhereInput {
  const terms = q.split(/\s+/).filter((t) => t.length > 0).slice(0, 6);
  const metalMatches = (term: string) =>
    (Object.values(MetalType) as MetalType[]).filter((m) => m.replace("_", " ").toLowerCase().includes(term.toLowerCase()));
  return {
    AND: terms.map((term) => {
      const metals = metalMatches(term);
      return {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { sku: { contains: term, mode: "insensitive" } },
          { variants: { some: { sku: { contains: term, mode: "insensitive" } } } },
          { shortDescription: { contains: term, mode: "insensitive" } },
          { gemstoneType: { contains: term, mode: "insensitive" } },
          { purity: { equals: term, mode: "insensitive" } },
          { style: { contains: term, mode: "insensitive" } },
          { primaryCategory: { name: { contains: term, mode: "insensitive" } } },
          { categories: { some: { category: { name: { contains: term, mode: "insensitive" } } } } },
          { collections: { some: { collection: { name: { contains: term, mode: "insensitive" }, isPublished: true } } } },
          ...(metals.length ? [{ metalType: { in: metals } }] : []),
        ],
      } satisfies Prisma.ProductWhereInput;
    }),
  };
}

/** Filters that narrow the result set (everything except the base scope). */
export function filterWhere(f: ListingFilters, opts: { omit?: keyof ListingFilters } = {}): Prisma.ProductWhereInput[] {
  const and: Prisma.ProductWhereInput[] = [];
  const active = (k: keyof ListingFilters) => opts.omit !== k;
  if (f.q) and.push(searchWhere(f.q));
  if (active("type") && f.type.length) and.push({ primaryCategory: { slug: { in: f.type } } });
  if (active("material") && f.material.length)
    and.push({ categories: { some: { category: { slug: { in: f.material }, kind: "MATERIAL" } } } });
  if (active("occasion") && f.occasion.length)
    and.push({ categories: { some: { category: { slug: { in: f.occasion }, kind: "OCCASION" } } } });
  if (active("metal") && f.metal.length) and.push({ metalType: { in: f.metal } });
  if (active("purity") && f.purity.length) and.push({ purity: { in: f.purity } });
  if (active("gemstone") && f.gemstone.length) and.push({ gemstoneType: { in: f.gemstone } });
  if (active("clarity") && f.clarity.length) and.push({ diamondClarity: { in: f.clarity } });
  if (active("style") && f.style.length) and.push({ style: { in: f.style } });
  if (active("size") && f.size.length) and.push({ variants: { some: { size: { in: f.size }, isActive: true } } });
  if (f.priceMin != null) and.push({ minPrice: { gte: Math.round(f.priceMin * 100) } });
  if (f.priceMax != null) and.push({ minPrice: { lte: Math.round(f.priceMax * 100) } });
  if (f.caratMin != null) and.push({ diamondCarat: { gte: f.caratMin } });
  if (f.caratMax != null) and.push({ diamondCarat: { lte: f.caratMax } });
  if (f.inStock) and.push({ inStock: true });
  if (f.onSale) and.push({ maxDiscountPct: { gt: 0 } });
  return and;
}

export function orderBy(sort: SortValue): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ publishedAt: { sort: "desc", nulls: "last" } }, { id: "asc" }];
    case "price_asc":
      return [{ minPrice: "asc" }, { id: "asc" }];
    case "price_desc":
      return [{ minPrice: "desc" }, { id: "asc" }];
    default:
      return [{ inStock: "desc" }, { salesCount: "desc" }, { ratingCount: "desc" }, { id: "asc" }];
  }
}

/** Serialize filters back to a query string (used for chips, pagination, and canonical URLs). */
export function filtersToQuery(f: Partial<ListingFilters>, overrides: Partial<ListingFilters> = {}): string {
  const merged = { ...f, ...overrides } as Partial<ListingFilters>;
  const p = new URLSearchParams();
  if (merged.q) p.set("q", merged.q);
  for (const key of ["type", "material", "occasion", "metal", "purity", "gemstone", "clarity", "style", "size"] as const) {
    const v = merged[key] as string[] | undefined;
    if (v && v.length) p.set(key, v.join(","));
  }
  if (merged.priceMin != null) p.set("priceMin", String(merged.priceMin));
  if (merged.priceMax != null) p.set("priceMax", String(merged.priceMax));
  if (merged.caratMin != null) p.set("caratMin", String(merged.caratMin));
  if (merged.caratMax != null) p.set("caratMax", String(merged.caratMax));
  if (merged.inStock) p.set("availability", "in-stock");
  if (merged.onSale) p.set("discount", "1");
  if (merged.sort && merged.sort !== "popular") p.set("sort", merged.sort);
  if (merged.page && merged.page > 1) p.set("page", String(merged.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}
