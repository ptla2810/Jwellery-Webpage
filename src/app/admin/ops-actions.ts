"use server";

import { Prisma, BannerPlacement, DiscountType, ReviewStatus, SupportStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertPermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { syncProductRating } from "@/lib/catalog/sync";
import { rupeesToPaise } from "@/lib/money";
import { saveSetting, type SettingKey } from "@/lib/settings";
import { saveImageUpload, UploadError } from "@/lib/storage";
import { PERMISSIONS, type PermissionKey } from "@/lib/auth/permissions";
import type { AdminState } from "@/components/admin/forms";

type Perm = PermissionKey;
async function who(p: Perm) {
  return assertPermission(p).catch(() => null);
}
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optDate = (v: string) => (v ? new Date(v) : null);

// ───────── customers ─────────
export async function setUserActiveAction(userId: string, isActive: boolean): Promise<AdminState> {
  const actor = await who("customers.read");
  if (!actor) return { error: "Not allowed" };
  if (actor.id === userId) return { error: "You cannot deactivate your own account" };
  const target = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!target) return { error: "User not found" };
  if (target.role.key !== "customer" && !actor.permissions.has("staff.write")) return { error: "Only staff managers can change staff accounts" };
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  if (!isActive) await prisma.session.deleteMany({ where: { userId } });
  await audit(actor.id, isActive ? "user.activate" : "user.deactivate", "User", userId);
  return { ok: true, message: isActive ? "Account activated" : "Account deactivated and signed out" };
}

// ───────── reviews ─────────
export async function moderateReviewAction(reviewId: string, status: ReviewStatus): Promise<AdminState> {
  const actor = await who("reviews.write");
  if (!actor) return { error: "Not allowed" };
  const r = await prisma.review.update({ where: { id: reviewId }, data: { status } });
  await syncProductRating(prisma, r.productId);
  await audit(actor.id, "review.moderate", "Review", reviewId, { status });
  return { ok: true, message: `Review ${status.toLowerCase()}` };
}

// ───────── support ─────────
export async function updateSupportAction(id: string, status: SupportStatus): Promise<AdminState> {
  const actor = await who("support.write");
  if (!actor) return { error: "Not allowed" };
  await prisma.supportRequest.update({ where: { id }, data: { status } });
  await audit(actor.id, "support.update", "SupportRequest", id, { status });
  return { ok: true, message: "Request updated" };
}

// ───────── coupons ─────────
export async function saveCouponAction(_: AdminState, form: FormData): Promise<AdminState> {
  const actor = await who("marketing.write");
  if (!actor) return { error: "Not allowed" };
  const parsed = z
    .object({
      code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "Code: 3–30 letters, numbers, - or _"),
      description: z.string().trim().max(200),
      type: z.nativeEnum(DiscountType),
      value: z.coerce.number().positive("Value must be positive"),
      minSubtotal: z.coerce.number().min(0),
      maxDiscount: z.string().trim(),
      usageLimit: z.string().trim(),
      perUserLimit: z.string().trim(),
      startsAt: z.string(),
      endsAt: z.string(),
    })
    .safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.type === "PERCENT" && (d.value > 90 || !Number.isInteger(d.value))) return { error: "Percentage must be a whole number up to 90" };
  const intOrNull = (s: string) => (s ? Math.max(0, Math.floor(Number(s))) : null);
  const data = {
    code: d.code,
    description: d.description || null,
    type: d.type,
    value: d.type === "PERCENT" ? d.value : rupeesToPaise(d.value),
    minSubtotal: rupeesToPaise(d.minSubtotal),
    maxDiscount: d.maxDiscount ? rupeesToPaise(d.maxDiscount) : null,
    usageLimit: intOrNull(d.usageLimit),
    perUserLimit: intOrNull(d.perUserLimit),
    startsAt: optDate(d.startsAt),
    endsAt: optDate(d.endsAt),
    isActive: form.get("isActive") === "on",
  };
  const id = str(form, "id");
  try {
    const saved = id ? await prisma.coupon.update({ where: { id }, data }) : await prisma.coupon.create({ data });
    await audit(actor.id, id ? "coupon.update" : "coupon.create", "Coupon", saved.id, { code: d.code });
    return { ok: true, message: "Coupon saved", redirectTo: "/admin/coupons" };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { error: "That code already exists" };
    throw err;
  }
}

export async function toggleCouponAction(id: string, isActive: boolean): Promise<AdminState> {
  const actor = await who("marketing.write");
  if (!actor) return { error: "Not allowed" };
  await prisma.coupon.update({ where: { id }, data: { isActive } });
  await audit(actor.id, "coupon.toggle", "Coupon", id, { isActive });
  return { ok: true, message: isActive ? "Coupon enabled" : "Coupon disabled" };
}

// ───────── banners ─────────
export async function saveBannerAction(_: AdminState, form: FormData): Promise<AdminState> {
  const actor = await who("marketing.write");
  if (!actor) return { error: "Not allowed" };
  const placement = z.nativeEnum(BannerPlacement).safeParse(form.get("placement"));
  if (!placement.success) return { error: "Choose a placement" };
  const title = str(form, "title");
  if (title.length < 2) return { error: "Title required" };
  const ctaHref = str(form, "ctaHref");
  if (ctaHref && !/^\/[^/]/.test(ctaHref) && !/^https:\/\//.test(ctaHref)) return { error: "Link must be a site path like /collections/bridal or an https:// URL" };
  const id = str(form, "id");
  let imageUrl: string | undefined;
  try {
    const f = form.get("image");
    if (f instanceof File && f.size) imageUrl = await saveImageUpload(f);
  } catch (err) {
    return { error: err instanceof UploadError ? err.message : "Upload failed" };
  }
  if (!id && !imageUrl) return { error: "Upload a banner image" };
  const data = {
    placement: placement.data,
    eyebrow: str(form, "eyebrow").slice(0, 60) || null,
    title: title.slice(0, 120),
    subtitle: str(form, "subtitle").slice(0, 300) || null,
    ctaLabel: str(form, "ctaLabel").slice(0, 40) || null,
    ctaHref: ctaHref || null,
    imageAlt: str(form, "imageAlt").slice(0, 160),
    sortOrder: Number(str(form, "sortOrder")) || 0,
    isActive: form.get("isActive") === "on",
    startsAt: optDate(str(form, "startsAt")),
    endsAt: optDate(str(form, "endsAt")),
    ...(imageUrl ? { imageUrl } : {}),
  };
  const saved = id ? await prisma.banner.update({ where: { id }, data }) : await prisma.banner.create({ data: { ...data, imageUrl: imageUrl! } });
  await audit(actor.id, id ? "banner.update" : "banner.create", "Banner", saved.id);
  return { ok: true, message: "Banner saved", redirectTo: "/admin/banners" };
}

export async function deleteBannerAction(id: string): Promise<AdminState> {
  const actor = await who("marketing.write");
  if (!actor) return { error: "Not allowed" };
  await prisma.banner.delete({ where: { id } });
  await audit(actor.id, "banner.delete", "Banner", id);
  return { ok: true, message: "Banner deleted" };
}

// ───────── promotions ─────────
export async function savePromotionAction(_: AdminState, form: FormData): Promise<AdminState> {
  const actor = await who("marketing.write");
  if (!actor) return { error: "Not allowed" };
  const name = str(form, "name");
  if (name.length < 2) return { error: "Name required" };
  const id = str(form, "id");
  const data = {
    name: name.slice(0, 100),
    description: str(form, "description").slice(0, 500) || null,
    couponId: str(form, "couponId") || null,
    bannerId: str(form, "bannerId") || null,
    startsAt: optDate(str(form, "startsAt")),
    endsAt: optDate(str(form, "endsAt")),
    isActive: form.get("isActive") === "on",
  };
  const saved = id ? await prisma.promotion.update({ where: { id }, data }) : await prisma.promotion.create({ data });
  await audit(actor.id, id ? "promotion.update" : "promotion.create", "Promotion", saved.id);
  return { ok: true, message: "Campaign saved" };
}

// ───────── content pages ─────────
export async function savePageAction(_: AdminState, form: FormData): Promise<AdminState> {
  const actor = await who("content.write");
  if (!actor) return { error: "Not allowed" };
  const slug = str(form, "slug").toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { error: "Invalid slug" };
  const title = str(form, "title");
  const body = String(form.get("body") ?? "").slice(0, 50_000);
  if (title.length < 2 || body.trim().length < 10) return { error: "Title and content are required" };
  const id = str(form, "id");
  const data = { slug, title, body, isPublished: form.get("isPublished") === "on", seoDescription: str(form, "seoDescription") || null };
  try {
    const saved = id ? await prisma.contentPage.update({ where: { id }, data }) : await prisma.contentPage.create({ data });
    await audit(actor.id, "content.update", "ContentPage", saved.id, { slug });
    return { ok: true, message: "Page saved", redirectTo: "/admin/pages" };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { error: "Slug already in use" };
    throw err;
  }
}

// ───────── settings ─────────
export async function saveSettingsAction(_: AdminState, form: FormData): Promise<AdminState> {
  const actor = await who("settings.write");
  if (!actor) return { error: "Not allowed" };
  const key = str(form, "key") as SettingKey;
  const b = (k: string) => form.get(k) === "on";
  const paise = (k: string) => rupeesToPaise(Number(str(form, k) || 0));
  const list = (k: string) => str(form, k).split(/[\s,]+/).filter(Boolean);
  let value: unknown;
  switch (key) {
    case "store":
      value = { name: str(form, "name"), tagline: str(form, "tagline"), supportEmail: str(form, "supportEmail"), supportPhone: str(form, "supportPhone"), whatsapp: str(form, "whatsapp"), address: str(form, "address"), supportHours: str(form, "supportHours"), social: { instagram: str(form, "instagram"), facebook: str(form, "facebook"), youtube: str(form, "youtube"), pinterest: str(form, "pinterest") } };
      break;
    case "announcement":
      value = { isActive: b("isActive"), messages: String(form.get("messages") ?? "").split("\n").map((s) => s.trim()).filter(Boolean) };
      break;
    case "shipping":
      value = {
        freeShippingThreshold: paise("freeShippingThreshold"), standardFee: paise("standardFee"), expressEnabled: b("expressEnabled"), expressFee: paise("expressFee"),
        standardDays: [Number(str(form, "standardMin")), Number(str(form, "standardMax"))], expressDays: [Number(str(form, "expressMin")), Number(str(form, "expressMax"))],
        metroPrefixes: list("metroPrefixes"), metroDaysReduction: Number(str(form, "metroDaysReduction")), unserviceablePrefixes: list("unserviceablePrefixes"),
        codEnabled: b("codEnabled"), codFee: paise("codFee"), codMaxOrderValue: paise("codMaxOrderValue"),
      };
      break;
    case "tax":
      value = { gstRateBps: Math.round(Number(str(form, "gstRate")) * 100), pricesIncludeTax: b("pricesIncludeTax"), note: str(form, "note") };
      break;
    case "consultation":
      value = { isActive: b("isActive"), title: str(form, "title"), body: str(form, "body"), storeName: str(form, "storeName"), storeAddress: str(form, "storeAddress"), storeHours: str(form, "storeHours"), mapUrl: str(form, "mapUrl") };
      break;
    default:
      return { error: "Unknown settings group" };
  }
  try {
    await saveSetting(key, value);
  } catch (err) {
    if (err instanceof z.ZodError) return { error: `Invalid value: ${err.issues[0].path.join(".")} — ${err.issues[0].message}` };
    throw err;
  }
  await audit(actor.id, "settings.update", "StoreSetting", key);
  return { ok: true, message: "Settings saved" };
}

// ───────── staff & roles ─────────
export async function assignRoleAction(_: AdminState, form: FormData): Promise<AdminState> {
  const actor = await who("staff.write");
  if (!actor) return { error: "Not allowed" };
  const email = str(form, "email").toLowerCase();
  const role = await prisma.role.findUnique({ where: { key: str(form, "role") } });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "No account with that email. Ask them to register first." };
  if (!role) return { error: "Role not found" };
  if (user.id === actor.id && role.key !== "admin") return { error: "You cannot remove your own admin role" };
  await prisma.user.update({ where: { id: user.id }, data: { roleId: role.id } });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await audit(actor.id, "staff.role.assign", "User", user.id, { role: role.key });
  return { ok: true, message: `${email} is now ${role.name}` };
}

export async function saveRoleAction(_: AdminState, form: FormData): Promise<AdminState> {
  const actor = await who("staff.write");
  if (!actor) return { error: "Not allowed" };
  const key = str(form, "key").toLowerCase();
  const name = str(form, "name");
  if (!/^[a-z][a-z0-9_-]{2,30}$/.test(key) || name.length < 2) return { error: "Enter a role key (lowercase) and name" };
  if (key === "admin" || key === "customer") return { error: "System roles cannot be edited" };
  const perms = form.getAll("permissions").map(String).filter((p) => p in PERMISSIONS);
  const permRows = await prisma.permission.findMany({ where: { key: { in: perms } } });
  const role = await prisma.role.upsert({ where: { key }, create: { key, name }, update: { name } });
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
    prisma.rolePermission.createMany({ data: permRows.map((p) => ({ roleId: role.id, permissionId: p.id })) }),
  ]);
  await audit(actor.id, "staff.role.save", "Role", role.id, { key, perms });
  return { ok: true, message: "Role saved" };
}
