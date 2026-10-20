"use server";

import { Prisma, MetalType, ProductStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertPermission, AuthorizationError } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { syncProductDerived } from "@/lib/catalog/sync";
import { rupeesToPaise } from "@/lib/money";
import { saveImageUpload, UploadError } from "@/lib/storage";
import type { AdminState } from "@/components/admin/forms";

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const money = z.union([z.string(), z.number()]).transform((v, ctx) => {
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0 || n > 1e8) {
    ctx.addIssue({ code: "custom", message: "Enter a valid amount" });
    return z.NEVER;
  }
  return rupeesToPaise(n);
});
const decimal = z.union([z.string(), z.number()]).transform((v, ctx) => {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 100000) {
    ctx.addIssue({ code: "custom", message: "Enter a valid number" });
    return z.NEVER;
  }
  return n;
});
const optStr = (max: number) => z.string().trim().max(max).transform((s) => s || null);

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(3, "SKU required").max(40).regex(/^[A-Za-z0-9-_.]+$/, "SKU: letters, numbers, - _ . only"),
  name: z.string().trim().min(1, "Variant name required").max(60),
  size: optStr(20),
  price: money.refine((v) => v != null && v > 0, "Price required"),
  compareAtPrice: money,
  metalValue: money,
  makingCharges: money,
  stoneValue: money,
  grossWeight: decimal,
  stock: z.coerce.number().int().min(0).max(100000),
  isActive: z.boolean(),
  isDefault: z.boolean(),
});

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name required").max(120),
  slug: z.string().trim().max(120).transform((s) => s.toLowerCase()),
  sku: z.string().trim().min(3, "Product SKU required").max(40).regex(/^[A-Za-z0-9-_.]+$/),
  shortDescription: z.string().trim().min(10, "Add a short description (10+ chars)").max(300),
  description: z.string().trim().min(10, "Add a description").max(5000),
  careInstructions: optStr(1000),
  status: z.nativeEnum(ProductStatus),
  primaryCategoryId: z.string().min(1, "Choose a primary category"),
  metalType: z.nativeEnum(MetalType),
  purity: z.string().trim().min(2).max(10),
  gender: z.enum(["WOMEN", "MEN", "KIDS", "UNISEX"]),
  style: optStr(40),
  gemstoneType: optStr(40),
  diamondClarity: optStr(10),
  diamondColor: optStr(10),
  diamondCarat: decimal,
  grossWeight: decimal,
  netWeight: decimal,
  certification: optStr(300),
  seoTitle: optStr(120),
  seoDescription: optStr(300),
  isPriceEstimated: z.boolean(),
  isFeatured: z.boolean(),
  isBestSeller: z.boolean(),
  isTrending: z.boolean(),
  isLightweight: z.boolean(),
  categoryIds: z.array(z.string()).max(40),
  collectionIds: z.array(z.string()).max(40),
  variants: z.array(variantSchema).min(1, "Add at least one variant").max(30),
  attributes: z.array(z.object({ group: z.string().trim().min(1).max(30), name: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(200) })).max(40),
});

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 100);
}

function issues(e: z.ZodError) {
  const fe: Record<string, string> = {};
  for (const i of e.issues) fe[i.path.join(".")] ??= i.message;
  return fe;
}

export async function saveProductAction(_: AdminState, form: FormData): Promise<AdminState> {
  let user;
  try {
    user = await assertPermission("products.write");
  } catch (e) {
    return { error: (e as AuthorizationError).message };
  }
  const bool = (k: string) => form.get(k) === "on" || form.get(k) === "true";
  let variants: unknown = [];
  let attributes: unknown = [];
  try {
    variants = JSON.parse(String(form.get("variants") ?? "[]"));
    attributes = JSON.parse(String(form.get("attributes") ?? "[]"));
  } catch {
    return { error: "Invalid variant data" };
  }
  const parsed = productSchema.safeParse({
    ...Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")),
    id: String(form.get("id") ?? "") || undefined,
    isPriceEstimated: bool("isPriceEstimated"),
    isFeatured: bool("isFeatured"),
    isBestSeller: bool("isBestSeller"),
    isTrending: bool("isTrending"),
    isLightweight: bool("isLightweight"),
    categoryIds: form.getAll("categoryIds").map(String),
    collectionIds: form.getAll("collectionIds").map(String),
    variants,
    attributes,
  });
  if (!parsed.success) return { error: "Please fix the highlighted fields", fieldErrors: issues(parsed.error) };
  const d = parsed.data;
  const slug = d.slug || slugify(d.name);
  if (!slugRe.test(slug)) return { error: "Slug may contain lowercase letters, numbers and hyphens", fieldErrors: { slug: "Invalid slug" } };
  const skus = d.variants.map((v) => v.sku.toUpperCase());
  if (new Set(skus).size !== skus.length) return { error: "Variant SKUs must be unique" };
  for (const v of d.variants) {
    if (v.compareAtPrice != null && v.compareAtPrice <= v.price!) return { error: `Compare-at price for ${v.sku} must be higher than the selling price (or left blank)` };
  }
  if (!d.variants.some((v) => v.isDefault)) d.variants[0].isDefault = true;

  const data = {
    name: d.name,
    slug,
    sku: d.sku.toUpperCase(),
    shortDescription: d.shortDescription,
    description: d.description,
    careInstructions: d.careInstructions,
    status: d.status,
    primaryCategoryId: d.primaryCategoryId,
    metalType: d.metalType,
    purity: d.purity,
    gender: d.gender,
    style: d.style,
    gemstoneType: d.gemstoneType,
    diamondClarity: d.diamondClarity,
    diamondColor: d.diamondColor,
    diamondCarat: d.diamondCarat,
    grossWeight: d.grossWeight,
    netWeight: d.netWeight,
    certification: d.certification,
    seoTitle: d.seoTitle,
    seoDescription: d.seoDescription,
    isPriceEstimated: d.isPriceEstimated,
    isFeatured: d.isFeatured,
    isBestSeller: d.isBestSeller,
    isTrending: d.isTrending,
    isLightweight: d.isLightweight,
  };

  try {
    const productId = await prisma.$transaction(async (tx) => {
      const existing = d.id ? await tx.product.findUnique({ where: { id: d.id } }) : null;
      if (d.id && !existing) throw new Error("Product not found");
      const product = existing
        ? await tx.product.update({ where: { id: existing.id }, data: { ...data, publishedAt: existing.publishedAt ?? (d.status === "ACTIVE" ? new Date() : null) } })
        : await tx.product.create({ data: { ...data, publishedAt: d.status === "ACTIVE" ? new Date() : null } });

      await tx.productCategory.deleteMany({ where: { productId: product.id } });
      const catIds = [...new Set(d.categoryIds.filter((c) => c !== d.primaryCategoryId))];
      if (catIds.length) await tx.productCategory.createMany({ data: catIds.map((categoryId) => ({ productId: product.id, categoryId })) });

      const currentCols = await tx.collectionProduct.findMany({ where: { productId: product.id } });
      await tx.collectionProduct.deleteMany({ where: { productId: product.id, collectionId: { notIn: d.collectionIds } } });
      for (const cid of d.collectionIds.filter((c) => !currentCols.some((x) => x.collectionId === c))) {
        await tx.collectionProduct.create({ data: { productId: product.id, collectionId: cid } });
      }

      await tx.productAttribute.deleteMany({ where: { productId: product.id } });
      if (d.attributes.length) await tx.productAttribute.createMany({ data: d.attributes.map((a, i) => ({ ...a, productId: product.id, sortOrder: i })) });

      const existingVariants = await tx.productVariant.findMany({ where: { productId: product.id }, include: { inventory: true } });
      const keep = new Set<string>();
      for (const [i, v] of d.variants.entries()) {
        const { id, stock, ...vd } = v;
        const vdata = { ...vd, sku: vd.sku.toUpperCase(), price: vd.price!, sortOrder: i };
        const match = id ? existingVariants.find((x) => x.id === id) : undefined;
        if (match) {
          keep.add(match.id);
          await tx.productVariant.update({ where: { id: match.id }, data: vdata });
          const current = match.inventory?.quantity ?? 0;
          if (stock !== current) {
            await tx.inventory.upsert({ where: { variantId: match.id }, create: { variantId: match.id, quantity: stock }, update: { quantity: stock } });
            await tx.inventoryMovement.create({ data: { variantId: match.id, delta: stock - current, reason: "ADJUSTMENT", actorId: user.id, note: "Product editor" } });
          }
        } else {
          const created = await tx.productVariant.create({ data: { ...vdata, productId: product.id } });
          keep.add(created.id);
          await tx.inventory.create({ data: { variantId: created.id, quantity: stock } });
          if (stock) await tx.inventoryMovement.create({ data: { variantId: created.id, delta: stock, reason: "INITIAL", actorId: user.id } });
        }
      }
      // Removed variants are deactivated (not deleted) so historical orders keep their references.
      await tx.productVariant.updateMany({ where: { productId: product.id, id: { notIn: [...keep] } }, data: { isActive: false, isDefault: false } });
      await syncProductDerived(tx, product.id);
      return product.id;
    });
    await audit(user.id, d.id ? "product.update" : "product.create", "Product", productId, { sku: data.sku, status: d.status });
    revalidatePath(`/products/${slug}`);
    return { ok: true, message: d.id ? "Product saved" : "Product created", redirectTo: d.id ? undefined : `/admin/products/${productId}` };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = String(err.meta?.target ?? "");
      return { error: target.includes("slug") ? "That slug is already used by another product" : "That SKU is already in use", fieldErrors: target.includes("slug") ? { slug: "Already in use" } : { sku: "Already in use" } };
    }
    console.error("[admin] save product", err);
    return { error: "Could not save product" };
  }
}

export async function setProductStatusAction(id: string, status: ProductStatus): Promise<AdminState> {
  const user = await assertPermission("products.write");
  const p = await prisma.product.update({ where: { id }, data: { status, ...(status === "ACTIVE" ? { publishedAt: new Date() } : {}) } });
  await audit(user.id, "product.status", "Product", id, { status });
  revalidatePath(`/products/${p.slug}`);
  return { ok: true, message: `Product ${status.toLowerCase()}` };
}

export async function uploadProductImageAction(_: AdminState, form: FormData): Promise<AdminState> {
  const user = await assertPermission("products.write");
  const productId = String(form.get("productId"));
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { images: true } });
  if (!product) return { error: "Product not found" };
  if (product.images.length >= 12) return { error: "Maximum 12 images per product" };
  try {
    const url = await saveImageUpload(form.get("file") as File);
    const alt = String(form.get("alt") ?? "").trim().slice(0, 160) || product.name;
    await prisma.productImage.create({ data: { productId, url, alt, sortOrder: product.images.length } });
    await audit(user.id, "product.image.add", "Product", productId, { url });
    return { ok: true, message: "Image uploaded" };
  } catch (err) {
    return { error: err instanceof UploadError ? err.message : "Upload failed" };
  }
}

export async function updateImageAction(imageId: string, patch: { alt?: string; move?: -1 | 1 }): Promise<AdminState> {
  await assertPermission("products.write");
  const img = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!img) return { error: "Image not found" };
  if (patch.alt != null) await prisma.productImage.update({ where: { id: imageId }, data: { alt: patch.alt.slice(0, 160) } });
  if (patch.move) {
    const all = await prisma.productImage.findMany({ where: { productId: img.productId }, orderBy: { sortOrder: "asc" } });
    const idx = all.findIndex((x) => x.id === imageId);
    const swap = all[idx + patch.move];
    if (swap) {
      const order = [...all];
      [order[idx], order[idx + patch.move]] = [order[idx + patch.move], order[idx]];
      await prisma.$transaction(order.map((x, i) => prisma.productImage.update({ where: { id: x.id }, data: { sortOrder: i } })));
    }
  }
  return { ok: true, message: "Image updated" };
}

export async function deleteImageAction(imageId: string): Promise<AdminState> {
  const user = await assertPermission("products.write");
  const img = await prisma.productImage.delete({ where: { id: imageId } });
  await audit(user.id, "product.image.delete", "Product", img.productId, { url: img.url });
  return { ok: true, message: "Image removed" };
}
