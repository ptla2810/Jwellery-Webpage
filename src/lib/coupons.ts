import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./db";
import type { CouponRule } from "./pricing";

type Db = PrismaClient | Prisma.TransactionClient;

export async function loadCoupon(
  code: string,
  userId: string | null,
  db: Db = prisma,
): Promise<{ ok: true; rule: CouponRule; id: string } | { ok: false; error: string }> {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,30}$/.test(normalized)) return { ok: false, error: "Enter a valid coupon code" };
  const c = await db.coupon.findUnique({ where: { code: normalized } });
  const now = new Date();
  if (!c || !c.isActive) return { ok: false, error: "This coupon code is not valid" };
  if (c.startsAt && c.startsAt > now) return { ok: false, error: "This coupon is not active yet" };
  if (c.endsAt && c.endsAt < now) return { ok: false, error: "This coupon has expired" };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return { ok: false, error: "This coupon has reached its usage limit" };
  if (c.perUserLimit != null) {
    if (!userId) return { ok: false, error: "Please sign in to use this coupon" };
    const used = await db.couponUsage.count({ where: { couponId: c.id, userId } });
    if (used >= c.perUserLimit) return { ok: false, error: "You have already used this coupon" };
  }
  return {
    ok: true,
    id: c.id,
    rule: { code: c.code, type: c.type, value: c.value, minSubtotal: c.minSubtotal, maxDiscount: c.maxDiscount },
  };
}
