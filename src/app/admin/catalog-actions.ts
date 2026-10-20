"use server";

import { Prisma, CategoryKind, CollectionRule } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertPermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { syncProductDerived } from "@/lib/catalog/sync";
import { invalidateNavigation } from "@/lib/catalog/queries";
import { saveImageUpload, UploadError } from "@/lib/storage";
import type { AdminState } from "@/components/admin/forms";

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
const optional = (max: number) => z.string().trim().max(max).transform((s) => s || null);

async function maybeUpload(form: FormData, key: string): Promise<string | undefined> {
  const f = form.get(key);
  if (f instanceof File && f.size > 0) return saveImageUpload(f);
  return undefined;
}

// ───────── inventory ─────────

export async function adjustStockAction(_: AdminState, form: FormData): Promise<AdminState> {
  const user = await assertPermission("inventory.write").catch(() => null);
  if (!user) return { error: "You are not allowed to adjust stock" };
  const parsed = z
    .object({
      variantId: z.string().min(1),
      mode: z.enum(["delta", "set"]),
      amount: z.coerce.number().int().min(-10000).max(10000),
      reason: z.enum(["RESTOCK", "ADJUSTMENT"]),
      note: z.string().trim().max(200).optional(),
      threshold: z.coerce.number().int().min(0).max(1000).optional(),
    })
    .safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  try {
    await prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.upsert({ where: { variantId: d.variantId }, create: { variantId: d.variantId, quantity: 0 }, update: {} });
      const delta = d.mode === "set" ? d.amount - inv.quantity : d.amount;
      if (inv.quantity + delta < 0) throw new Error("Stock cannot go below zero");
      if (delta !== 0) {
        await tx.inventory.update({ where: { id: inv.id }, data: { quantity: { increment: delta } } });
        await tx.inventoryMovement.create({ data: { variantId: d.variantId, delta, reason: d.reason, actorId: user.id, note: d.note || null } });
      }
      if (d.threshold != null) await tx.inventory.update({ where: { id: inv.id }, data: { lowStockThreshold: d.threshold } });
      const v = await tx.productVariant.findUniqueOrThrow({ where: { id: d.variantId } });
      await syncProductDerived(tx, v.productId);
    });
  } catch (err) {
    return { error: (err as Error).message };
  }
  await audit(user.id, "inventory.adjust", "ProductVariant", d.variantId, { mode: d.mode, amount: d.amount, reason: d.reason });
  return { ok: true, message: "Stock updated" };
}

// ───────── categories ─────────

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name required").max(60),
  slug: z.string().trim().max(80),
  kind: z.nativeEnum(CategoryKind),
  parentId: optional(40),
  description: optional(500),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isActive: z.boolean(),
  showInMenu: z.boolean(),
  seoTitle: optional(120),
  seoDescription: optional(300),
});

export async function saveCategoryAction(_: AdminState, form: FormData): Promise<AdminState> {
  const user = await assertPermission("catalog.write").catch(() => null);
  if (!user) return { error: "Not allowed" };
  const parsed = categorySchema.safeParse({ ...Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")), id: String(form.get("id") ?? "") || undefined, isActive: form.get("isActive") === "on", showInMenu: form.get("showInMenu") === "on" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, ...d } = parsed.data;
  d.slug = (d.slug || slugify(d.name)).toLowerCase();
  if (!slugRe.test(d.slug)) return { error: "Invalid slug" };
  if (id && d.parentId === id) return { error: "A category cannot be its own parent" };
  try {
    const imageUrl = await maybeUpload(form, "image");
    const bannerUrl = await maybeUpload(form, "banner");
    const data = { ...d, ...(imageUrl ? { imageUrl } : {}), ...(bannerUrl ? { bannerUrl } : {}) };
    const saved = id ? await prisma.category.update({ where: { id }, data }) : await prisma.category.create({ data });
    invalidateNavigation();
    await audit(user.id, id ? "category.update" : "category.create", "Category", saved.id, { slug: d.slug });
    return { ok: true, message: "Category saved", redirectTo: id ? undefined : `/admin/categories/${saved.id}` };
  } catch (err) {
    if (err instanceof UploadError) return { error: err.message };
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { error: "That slug is already in use" };
    throw err;
  }
}

export async function deleteCategoryAction(id: string): Promise<AdminState> {
  const user = await assertPermission("catalog.write").catch(() => null);
  if (!user) return { error: "Not allowed" };
  const used = await prisma.product.count({ where: { primaryCategoryId: id } });
  if (used) return { error: `Cannot delete: ${used} products use this as their primary category. Deactivate it instead.` };
  await prisma.category.delete({ where: { id } });
  invalidateNavigation();
  await audit(user.id, "category.delete", "Category", id);
  return { ok: true, message: "Category deleted" };
}

export async function moveCategoryAction(id: string, dir: -1 | 1): Promise<AdminState> {
  await assertPermission("catalog.write");
  const c = await prisma.category.findUniqueOrThrow({ where: { id } });
  const siblings = await prisma.category.findMany({ where: { kind: c.kind, parentId: c.parentId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const idx = siblings.findIndex((s) => s.id === id);
  const target = idx + dir;
  if (target < 0 || target >= siblings.length) return { ok: true };
  [siblings[idx], siblings[target]] = [siblings[target], siblings[idx]];
  await prisma.$transaction(siblings.map((s, i) => prisma.category.update({ where: { id: s.id }, data: { sortOrder: i } })));
  invalidateNavigation();
  return { ok: true, message: "Order updated" };
}

// ───────── collections ─────────

export async function saveCollectionAction(_: AdminState, form: FormData): Promise<AdminState> {
  const user = await assertPermission("catalog.write").catch(() => null);
  if (!user) return { error: "Not allowed" };
  const parsed = z
    .object({
      id: z.string().optional(),
      name: z.string().trim().min(2).max(80),
      slug: z.string().trim().max(80),
      description: optional(500),
      rule: z.nativeEnum(CollectionRule),
      sortOrder: z.coerce.number().int().min(0).max(9999),
      isPublished: z.boolean(),
      showInMenu: z.boolean(),
      seoTitle: optional(120),
      seoDescription: optional(300),
    })
    .safeParse({ ...Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")), id: String(form.get("id") ?? "") || undefined, isPublished: form.get("isPublished") === "on", showInMenu: form.get("showInMenu") === "on" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, ...d } = parsed.data;
  d.slug = (d.slug || slugify(d.name)).toLowerCase();
  if (!slugRe.test(d.slug)) return { error: "Invalid slug" };
  try {
    const imageUrl = await maybeUpload(form, "image");
    const bannerUrl = await maybeUpload(form, "banner");
    const data = { ...d, ...(imageUrl ? { imageUrl } : {}), ...(bannerUrl ? { bannerUrl } : {}) };
    const saved = id ? await prisma.collection.update({ where: { id }, data }) : await prisma.collection.create({ data });
    invalidateNavigation();
    await audit(user.id, id ? "collection.update" : "collection.create", "Collection", saved.id, { slug: d.slug, published: d.isPublished });
    return { ok: true, message: "Collection saved", redirectTo: id ? undefined : `/admin/collections/${saved.id}` };
  } catch (err) {
    if (err instanceof UploadError) return { error: err.message };
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { error: "That slug is already in use" };
    throw err;
  }
}

export async function collectionProductAction(collectionId: string, productIdOrSku: string, op: "add" | "remove"): Promise<AdminState> {
  const user = await assertPermission("catalog.write").catch(() => null);
  if (!user) return { error: "Not allowed" };
  const product = await prisma.product.findFirst({ where: { OR: [{ id: productIdOrSku }, { sku: productIdOrSku.trim().toUpperCase() }] } });
  if (!product) return { error: "No product with that SKU" };
  if (op === "add") {
    await prisma.collectionProduct.upsert({ where: { collectionId_productId: { collectionId, productId: product.id } }, create: { collectionId, productId: product.id }, update: {} });
  } else {
    await prisma.collectionProduct.deleteMany({ where: { collectionId, productId: product.id } });
  }
  await audit(user.id, `collection.product.${op}`, "Collection", collectionId, { sku: product.sku });
  return { ok: true, message: op === "add" ? `Added ${product.name}` : `Removed ${product.name}` };
}

export async function addToCollectionFormAction(_: AdminState, form: FormData): Promise<AdminState> {
  return collectionProductAction(String(form.get("collectionId")), String(form.get("sku") ?? ""), "add");
}
