import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getCurrentUser } from "./auth/session";
import { ensureGuestToken, readGuestToken } from "./guest";
import { cardInclude, toCard } from "./catalog/queries";

async function owner(): Promise<Prisma.WishlistWhereUniqueInput | null> {
  const user = await getCurrentUser();
  if (user) return { userId: user.id };
  const guestToken = await readGuestToken();
  return guestToken ? { guestToken } : null;
}

export async function wishlistProductIds(): Promise<string[]> {
  const o = await owner();
  if (!o) return [];
  const wl = await prisma.wishlist.findUnique({ where: o, select: { items: { select: { productId: true } } } });
  return wl?.items.map((i) => i.productId) ?? [];
}

export async function wishlistItems() {
  const o = await owner();
  if (!o) return [];
  const wl = await prisma.wishlist.findUnique({
    where: o,
    include: { items: { orderBy: { createdAt: "desc" }, include: { product: { include: cardInclude } } } },
  });
  return (wl?.items ?? []).map((i) => ({
    ...toCard(i.product),
    available: i.product.status === "ACTIVE" && i.product.inStock,
    status: i.product.status,
  }));
}

export async function toggleWishlist(productId: string): Promise<boolean> {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new Error("Product not found");
  const user = await getCurrentUser();
  const where: Prisma.WishlistWhereUniqueInput = user ? { userId: user.id } : { guestToken: await ensureGuestToken() };
  const wl = await prisma.wishlist.upsert({
    where,
    create: user ? { userId: user.id } : { guestToken: (where as { guestToken: string }).guestToken },
    update: {},
  });
  const existing = await prisma.wishlistItem.findUnique({ where: { wishlistId_productId: { wishlistId: wl.id, productId } } });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return false;
  }
  await prisma.wishlistItem.create({ data: { wishlistId: wl.id, productId } });
  return true;
}
