"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth/session";
import { phoneSchema } from "@/lib/orders/service";
import { estimateDelivery, formatDateRange } from "@/lib/delivery";
import { getSetting } from "@/lib/settings";
import { cardsBySlugs } from "@/lib/catalog/queries";
import { syncProductRating } from "@/lib/catalog/sync";
import { revalidatePath } from "next/cache";

export type FormState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> };

function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[i.path.join(".")] ??= i.message;
  return out;
}

export async function subscribeNewsletter(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("newsletter", 5, 600))) return { error: "Too many attempts. Please try again later." };
  const parsed = z.string().trim().toLowerCase().email("Please enter a valid email address").max(120).safeParse(form.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await prisma.newsletterSubscription.upsert({
    where: { email: parsed.data },
    create: { email: parsed.data, source: "footer" },
    update: { status: "SUBSCRIBED", unsubscribedAt: null },
  });
  return { ok: true, message: "Thank you — you're on the list." };
}

const supportSchema = z.object({
  type: z.enum(["SUPPORT", "CONSULTATION", "ORDER_ISSUE"]),
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(120),
  phone: z.union([z.literal(""), phoneSchema]).optional(),
  subject: z.string().trim().min(3, "Please add a subject").max(120),
  message: z.string().trim().min(10, "Please tell us a little more (10+ characters)").max(2000),
  orderNumber: z.string().trim().max(30).optional(),
  preferredDate: z.string().optional(),
  preferredMode: z.enum(["In store", "Video call", "Phone call"]).optional(),
});

export async function submitSupportRequest(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("support", 5, 600))) return { error: "Too many requests. Please try again later." };
  const raw = Object.fromEntries(form.entries());
  const parsed = supportSchema.safeParse({ ...raw, preferredMode: raw.preferredMode || undefined });
  if (!parsed.success) return { error: "Please correct the highlighted fields", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  let preferredDate: Date | null = null;
  if (d.preferredDate) {
    preferredDate = new Date(d.preferredDate);
    if (Number.isNaN(preferredDate.getTime()) || preferredDate < new Date(Date.now() - 86_400_000)) {
      return { error: "Please choose a future date", fieldErrors: { preferredDate: "Choose a future date" } };
    }
  }
  const user = await getCurrentUser();
  await prisma.supportRequest.create({
    data: {
      type: d.type,
      name: d.name,
      email: d.email,
      phone: d.phone || null,
      subject: d.subject,
      message: d.message,
      orderNumber: d.orderNumber || null,
      preferredDate,
      preferredMode: d.preferredMode ?? null,
      userId: user?.id ?? null,
    },
  });
  return { ok: true, message: d.type === "CONSULTATION" ? "Your consultation request has been received. Our team will contact you to confirm a time." : "Thanks — our customer care team will respond by email." };
}

export async function checkDeliveryAction(postalCode: string) {
  if (!(await rateLimit("pincode", 30, 60))) return { ok: false as const, message: "Too many checks, please wait a moment" };
  const est = estimateDelivery(String(postalCode), await getSetting("shipping"));
  if (!est.serviceable) return { ok: false as const, message: est.reason };
  return {
    ok: true as const,
    message: `Delivery by ${formatDateRange(est.standard.from, est.standard.to)}`,
    express: est.express ? `Express: ${formatDateRange(est.express.from, est.express.to)}` : null,
    cod: est.codAvailable,
  };
}

export async function recentlyViewedAction(slugs: string[]) {
  const clean = z.array(z.string().regex(/^[a-z0-9-]{1,120}$/)).max(12).safeParse(slugs);
  return clean.success ? cardsBySlugs(clean.data) : [];
}

const reviewSchema = z.object({
  productId: z.string().min(1).max(40),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  title: z.string().trim().min(3, "Add a short title").max(100),
  body: z.string().trim().min(10, "Tell us a bit more (10+ characters)").max(2000),
});

export async function submitReview(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to write a review" };
  if (!(await rateLimit("review", 5, 3600, user.id))) return { error: "Too many reviews submitted. Try again later." };
  const parsed = reviewSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: "Please correct the highlighted fields", fieldErrors: fieldErrors(parsed.error) };
  const { productId, ...rest } = parsed.data;
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, slug: true, status: true } });
  if (!product || product.status !== "ACTIVE") return { error: "Product not found" };
  const purchased = await prisma.orderItem.count({
    where: { productId, order: { userId: user.id, status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] } } },
  });
  const existing = await prisma.review.findUnique({ where: { productId_userId: { productId, userId: user.id } } });
  if (existing) {
    await prisma.review.update({ where: { id: existing.id }, data: { ...rest, status: "PENDING", isVerifiedPurchase: purchased > 0 } });
  } else {
    await prisma.review.create({ data: { productId, userId: user.id, authorName: user.name.split(" ")[0], ...rest, isVerifiedPurchase: purchased > 0 } });
  }
  await syncProductRating(prisma, productId);
  revalidatePath(`/products/${product.slug}`);
  return { ok: true, message: "Thank you! Your review will appear after moderation." };
}
