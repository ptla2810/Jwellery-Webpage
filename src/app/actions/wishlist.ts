"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { toggleWishlist, wishlistProductIds } from "@/lib/wishlist";
import { addItem, CartError, getCartView } from "@/lib/cart";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export async function toggleWishlistAction(productId: string) {
  if (!(await rateLimit("wishlist", 120, 60))) return { ok: false as const, error: "Too many requests" };
  try {
    const saved = await toggleWishlist(z.string().min(1).max(40).parse(productId));
    revalidatePath("/wishlist");
    return { ok: true as const, saved, ids: await wishlistProductIds() };
  } catch {
    return { ok: false as const, error: "Could not update your wishlist" };
  }
}

export async function moveWishlistToCartAction(productId: string) {
  const pid = z.string().min(1).max(40).parse(productId);
  const variant = await prisma.productVariant.findFirst({
    where: { productId: pid, isActive: true, inventory: { quantity: { gt: 0 } } },
    orderBy: [{ isDefault: "desc" }, { price: "asc" }],
  });
  if (!variant) return { ok: false as const, error: "This item is currently unavailable" };
  try {
    await addItem(variant.id, 1);
    await toggleWishlist(pid);
    revalidatePath("/wishlist");
    return { ok: true as const, cart: await getCartView(), ids: await wishlistProductIds() };
  } catch (err) {
    return { ok: false as const, error: err instanceof CartError ? err.message : "Could not move item to bag" };
  }
}
