import "server-only";
import { prisma } from "@/lib/db";
import type { EditorProduct } from "@/components/admin/ProductEditor";

const r = (p: number | null | undefined) => (p == null ? "" : String(p / 100));

export async function editorOptions() {
  const [categories, collections] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ kind: "asc" }, { sortOrder: "asc" }], select: { id: true, name: true, kind: true } }),
    prisma.collection.findMany({ where: { rule: "MANUAL" }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  return { categories, collections };
}

export async function loadEditorProduct(id: string): Promise<(EditorProduct & { images: { id: string; url: string; alt: string }[]; slugLive: string; statusLive: string }) | null> {
  const p = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { inventory: true } },
      attributes: { orderBy: { sortOrder: "asc" } },
      categories: true,
      collections: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!p) return null;
  return {
    id: p.id, name: p.name, slug: p.slug, sku: p.sku, shortDescription: p.shortDescription, description: p.description, careInstructions: p.careInstructions ?? "",
    status: p.status, primaryCategoryId: p.primaryCategoryId, metalType: p.metalType, purity: p.purity, gender: p.gender, style: p.style ?? "", gemstoneType: p.gemstoneType ?? "",
    diamondClarity: p.diamondClarity ?? "", diamondColor: p.diamondColor ?? "", diamondCarat: p.diamondCarat?.toString() ?? "", grossWeight: p.grossWeight?.toString() ?? "", netWeight: p.netWeight?.toString() ?? "",
    certification: p.certification ?? "", seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "", isPriceEstimated: p.isPriceEstimated, isFeatured: p.isFeatured, isBestSeller: p.isBestSeller,
    isTrending: p.isTrending, isLightweight: p.isLightweight, categoryIds: p.categories.map((c) => c.categoryId), collectionIds: p.collections.map((c) => c.collectionId),
    variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, name: v.name, size: v.size ?? "", price: r(v.price), compareAtPrice: r(v.compareAtPrice), metalValue: r(v.metalValue), makingCharges: r(v.makingCharges), stoneValue: r(v.stoneValue), grossWeight: v.grossWeight?.toString() ?? "", stock: v.inventory?.quantity ?? 0, isActive: v.isActive, isDefault: v.isDefault })),
    attributes: p.attributes.map((a) => ({ group: a.group, name: a.name, value: a.value })),
    images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
    slugLive: p.slug,
    statusLive: p.status,
  };
}
