import "server-only";
import { Prisma, type CategoryKind } from "@prisma/client";
import { prisma } from "../db";
import { discountPercent } from "../money";
import { filterWhere, orderBy, type ListingFilters } from "./filters";
import { metalSummary, METAL_LABELS } from "./labels";

export const PAGE_SIZE = 24;

export const cardInclude = {
  images: { orderBy: { sortOrder: "asc" }, take: 2 },
  variants: { where: { isActive: true }, orderBy: [{ isDefault: "desc" }, { price: "asc" }], take: 1 },
} satisfies Prisma.ProductInclude;

type CardSource = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  image: { url: string; alt: string } | null;
  hoverImage: { url: string; alt: string } | null;
  price: number;
  compareAtPrice: number | null;
  discountPct: number;
  metal: string;
  inStock: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  rating: number;
  ratingCount: number;
  defaultVariantId: string | null;
  isDemo: boolean;
};

const NEW_DAYS = 60;

export function toCard(p: CardSource): ProductCard {
  const v = p.variants[0];
  const price = v?.price ?? p.minPrice;
  const compareAt = v?.compareAtPrice && v.compareAtPrice > price ? v.compareAtPrice : null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    image: p.images[0] ? { url: p.images[0].url, alt: p.images[0].alt } : null,
    hoverImage: p.images[1] ? { url: p.images[1].url, alt: p.images[1].alt } : null,
    price,
    compareAtPrice: compareAt,
    discountPct: discountPercent(price, compareAt),
    metal: metalSummary(p.metalType, p.purity),
    inStock: p.inStock,
    isNew: !!p.publishedAt && Date.now() - p.publishedAt.getTime() < NEW_DAYS * 86_400_000,
    isBestSeller: p.isBestSeller,
    rating: Number(p.ratingAvg),
    ratingCount: p.ratingCount,
    defaultVariantId: v?.id ?? null,
    isDemo: p.isDemo,
  };
}

export const ACTIVE: Prisma.ProductWhereInput = { status: "ACTIVE" };

// ───────── navigation ─────────

export type NavCategory = { slug: string; name: string; imageUrl: string | null };
export type Navigation = {
  types: NavCategory[];
  materials: NavCategory[];
  occasions: NavCategory[];
  collections: NavCategory[];
};

let navCache: { at: number; value: Navigation } | null = null;
export function invalidateNavigation() {
  navCache = null;
}

export async function getNavigation(): Promise<Navigation> {
  if (navCache && Date.now() - navCache.at < 30_000) return navCache.value;
  const [cats, cols] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, showInMenu: true, parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { slug: true, name: true, imageUrl: true, kind: true },
    }),
    prisma.collection.findMany({
      where: { isPublished: true, showInMenu: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { slug: true, name: true, imageUrl: true },
    }),
  ]);
  const by = (k: CategoryKind) => cats.filter((c) => c.kind === k).map(({ slug, name, imageUrl }) => ({ slug, name, imageUrl }));
  const value = { types: by("TYPE"), materials: by("MATERIAL"), occasions: by("OCCASION"), collections: cols };
  navCache = { at: Date.now(), value };
  return value;
}

// ───────── listings ─────────

export type FacetOption = { value: string; label: string; count: number };
export type Facets = {
  type: FacetOption[];
  material: FacetOption[];
  occasion: FacetOption[];
  metal: FacetOption[];
  purity: FacetOption[];
  gemstone: FacetOption[];
  clarity: FacetOption[];
  style: FacetOption[];
  size: FacetOption[];
  hasDiamonds: boolean;
};

export type ListingResult = {
  items: ProductCard[];
  total: number;
  page: number;
  pageCount: number;
  facets: Facets;
};

function scope(base: Prisma.ProductWhereInput, f: ListingFilters, omit?: keyof ListingFilters): Prisma.ProductWhereInput {
  return { AND: [ACTIVE, base, ...filterWhere(f, { omit })] };
}

async function groupCount(field: "metalType" | "purity" | "gemstoneType" | "diamondClarity" | "style", where: Prisma.ProductWhereInput) {
  const rows = await prisma.product.groupBy({ by: [field], where, _count: { _all: true } });
  return rows
    .filter((r) => r[field] != null && r[field] !== "")
    .map((r) => ({ value: String(r[field]), count: r._count._all }));
}

async function categoryFacet(kind: CategoryKind, where: Prisma.ProductWhereInput): Promise<FacetOption[]> {
  if (kind === "TYPE") {
    const rows = await prisma.product.groupBy({ by: ["primaryCategoryId"], where, _count: { _all: true } });
    const cats = await prisma.category.findMany({
      where: { id: { in: rows.map((r) => r.primaryCategoryId) } },
      select: { id: true, slug: true, name: true, sortOrder: true },
      orderBy: { sortOrder: "asc" },
    });
    return cats.map((c) => ({
      value: c.slug,
      label: c.name,
      count: rows.find((r) => r.primaryCategoryId === c.id)?._count._all ?? 0,
    }));
  }
  const rows = await prisma.productCategory.groupBy({
    by: ["categoryId"],
    where: { product: where, category: { kind, isActive: true } },
    _count: { _all: true },
  });
  const cats = await prisma.category.findMany({
    where: { id: { in: rows.map((r) => r.categoryId) } },
    select: { id: true, slug: true, name: true },
    orderBy: { sortOrder: "asc" },
  });
  return cats.map((c) => ({ value: c.slug, label: c.name, count: rows.find((r) => r.categoryId === c.id)?._count._all ?? 0 }));
}

export async function listProducts(base: Prisma.ProductWhereInput, f: ListingFilters, pageSize = PAGE_SIZE): Promise<ListingResult> {
  const where = scope(base, f);
  const [total, metal, purity, gemstone, clarity, style, type, material, occasion, sizes] = await Promise.all([
    prisma.product.count({ where }),
    groupCount("metalType", scope(base, f, "metal")),
    groupCount("purity", scope(base, f, "purity")),
    groupCount("gemstoneType", scope(base, f, "gemstone")),
    groupCount("diamondClarity", scope(base, f, "clarity")),
    groupCount("style", scope(base, f, "style")),
    categoryFacet("TYPE", scope(base, f, "type")),
    categoryFacet("MATERIAL", scope(base, f, "material")),
    categoryFacet("OCCASION", scope(base, f, "occasion")),
    prisma.productVariant.groupBy({
      by: ["size"],
      where: { isActive: true, size: { not: null }, product: scope(base, f, "size") },
      _count: { _all: true },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(f.page, pageCount);
  const rows = await prisma.product.findMany({
    where,
    include: cardInclude,
    orderBy: orderBy(f.sort),
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  const label = (o: { value: string; count: number }, l?: string) => ({ ...o, label: l ?? o.value });
  const sizeSort = (a: string, b: string) => (Number(a) || 0) - (Number(b) || 0) || a.localeCompare(b);
  return {
    items: rows.map(toCard),
    total,
    page,
    pageCount,
    facets: {
      type,
      material,
      occasion,
      metal: metal.map((o) => label(o, METAL_LABELS[o.value as keyof typeof METAL_LABELS])),
      purity: purity.map((o) => label(o)).sort((a, b) => a.label.localeCompare(b.label)),
      gemstone: gemstone.map((o) => label(o)),
      clarity: clarity.map((o) => label(o)),
      style: style.map((o) => label(o)),
      size: sizes
        .filter((s) => s.size)
        .map((s) => ({ value: s.size!, label: s.size!, count: s._count._all }))
        .sort((a, b) => sizeSort(a.value, b.value)),
      hasDiamonds: clarity.length > 0,
    },
  };
}

export async function productCards(where: Prisma.ProductWhereInput, opts: { take?: number; sort?: ListingFilters["sort"] } = {}) {
  const rows = await prisma.product.findMany({
    where: { AND: [ACTIVE, where] },
    include: cardInclude,
    orderBy: orderBy(opts.sort ?? "popular"),
    take: opts.take ?? 8,
  });
  return rows.map(toCard);
}

export async function cardsBySlugs(slugs: string[]) {
  if (!slugs.length) return [];
  const rows = await prisma.product.findMany({ where: { ...ACTIVE, slug: { in: slugs.slice(0, 24) } }, include: cardInclude });
  return slugs.map((s) => rows.find((r) => r.slug === s)).filter(Boolean).map((r) => toCard(r!));
}

// ───────── category & collection scopes ─────────

export async function getCategoryScope(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: { children: { where: { isActive: true }, orderBy: { sortOrder: "asc" } }, parent: true },
  });
  if (!category || !category.isActive) return null;
  const ids = [category.id, ...category.children.map((c) => c.id)];
  const where: Prisma.ProductWhereInput = {
    OR: [{ primaryCategoryId: { in: ids } }, { categories: { some: { categoryId: { in: ids } } } }],
  };
  return { category, where };
}

export function collectionWhere(c: { id: string; rule: string }): Prisma.ProductWhereInput {
  switch (c.rule) {
    case "NEW_ARRIVALS":
      return { publishedAt: { gte: new Date(Date.now() - 120 * 86_400_000) } };
    case "BEST_SELLERS":
      return { isBestSeller: true };
    case "TRENDING":
      return { isTrending: true };
    default:
      return { collections: { some: { collectionId: c.id } } };
  }
}

export async function getCollectionScope(slug: string) {
  const collection = await prisma.collection.findUnique({ where: { slug } });
  if (!collection || !collection.isPublished) return null;
  return { collection, where: collectionWhere(collection) };
}

// ───────── product detail ─────────

export async function getProductBySlug(slug: string, opts: { includeDrafts?: boolean } = {}) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }], include: { inventory: true } },
      attributes: { orderBy: [{ group: "asc" }, { sortOrder: "asc" }] },
      primaryCategory: { include: { parent: true } },
      categories: { include: { category: true } },
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!product) return null;
  if (product.status !== "ACTIVE" && !opts.includeDrafts) return null;
  return product;
}
export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

export async function relatedProducts(p: { id: string; primaryCategoryId: string; metalType: string }) {
  return productCards({ primaryCategoryId: p.primaryCategoryId, id: { not: p.id } }, { take: 8 });
}

/** Products co-purchased with this one; falls back to complementary pieces in the same metal. */
export async function frequentlyBoughtTogether(p: { id: string; primaryCategoryId: string; metalType: ProductDetail["metalType"] }) {
  const rows = await prisma.$queryRaw<{ productId: string; n: bigint }[]>`
    SELECT oi2."productId", COUNT(*) AS n
    FROM "OrderItem" oi1
    JOIN "OrderItem" oi2 ON oi1."orderId" = oi2."orderId" AND oi2."productId" <> oi1."productId"
    JOIN "Order" o ON o.id = oi1."orderId" AND o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED', 'PENDING_PAYMENT')
    WHERE oi1."productId" = ${p.id} AND oi2."productId" IS NOT NULL
    GROUP BY oi2."productId" ORDER BY n DESC LIMIT 3`;
  const ids = rows.map((r) => r.productId);
  const co = ids.length ? await productCards({ id: { in: ids } }, { take: 3 }) : [];
  if (co.length >= 2) return co;
  const fill = await productCards(
    { id: { notIn: [p.id, ...ids] }, primaryCategoryId: { not: p.primaryCategoryId }, metalType: p.metalType, inStock: true },
    { take: 3 - co.length },
  );
  return [...co, ...fill];
}

// ───────── search suggestions ─────────

export async function suggest(q: string) {
  const term = q.trim().slice(0, 60);
  if (term.length < 2) return { products: [], categories: [], collections: [] };
  const [products, categories, collections] = await Promise.all([
    prisma.product.findMany({
      where: {
        ...ACTIVE,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { sku: { contains: term, mode: "insensitive" } },
          { variants: { some: { sku: { contains: term, mode: "insensitive" } } } },
          { gemstoneType: { contains: term, mode: "insensitive" } },
          { primaryCategory: { name: { contains: term, mode: "insensitive" } } },
        ],
      },
      include: cardInclude,
      orderBy: [{ salesCount: "desc" }],
      take: 6,
    }),
    prisma.category.findMany({
      where: { isActive: true, name: { contains: term, mode: "insensitive" } },
      select: { slug: true, name: true },
      take: 4,
    }),
    prisma.collection.findMany({
      where: { isPublished: true, name: { contains: term, mode: "insensitive" } },
      select: { slug: true, name: true },
      take: 3,
    }),
  ]);
  return {
    products: products.map((p) => {
      const c = toCard(p);
      return { slug: c.slug, name: c.name, price: c.price, image: c.image, sku: p.sku };
    }),
    categories,
    collections,
  };
}
