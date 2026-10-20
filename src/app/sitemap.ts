import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [products, categories, collections, pages] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    prisma.collection.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    prisma.contentPage.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/collections`, changeFrequency: "weekly", priority: 0.7 },
    ...categories.map((c) => ({ url: `${base}/jewellery/${c.slug}`, lastModified: c.updatedAt, priority: 0.8 })),
    ...collections.map((c) => ({ url: `${base}/collections/${c.slug}`, lastModified: c.updatedAt, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: p.updatedAt, priority: 0.6 })),
    ...pages.map((p) => ({ url: `${base}/pages/${p.slug}`, lastModified: p.updatedAt, priority: 0.3 })),
  ];
}
