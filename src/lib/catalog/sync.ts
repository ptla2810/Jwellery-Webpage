import type { Prisma, PrismaClient } from "@prisma/client";
import { discountPercent } from "../money";

type Db = PrismaClient | Prisma.TransactionClient;

/** Recompute denormalised listing fields (min price, discount, stock flag) for a product. */
export async function syncProductDerived(db: Db, productId: string) {
  const variants = await db.productVariant.findMany({
    where: { productId, isActive: true },
    include: { inventory: true },
  });
  const minPrice = variants.length ? Math.min(...variants.map((v) => v.price)) : 0;
  const maxDiscountPct = variants.reduce((m, v) => Math.max(m, discountPercent(v.price, v.compareAtPrice)), 0);
  const inStock = variants.some((v) => (v.inventory?.quantity ?? 0) > 0);
  await db.product.update({ where: { id: productId }, data: { minPrice, maxDiscountPct, inStock } });
}

export async function syncProductRating(db: Db, productId: string) {
  const agg = await db.review.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: true,
  });
  await db.product.update({
    where: { id: productId },
    data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count },
  });
}
