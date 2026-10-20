"use server";

import { z } from "zod";
import { addItem, CartError, getCartView, removeItem, setCoupon, setItemQuantity, type CartView } from "@/lib/cart";
import { rateLimit } from "@/lib/rate-limit";

export type CartActionResult = { ok: true; cart: CartView; message?: string } | { ok: false; error: string; cart?: CartView };

const id = z.string().min(1).max(40);

async function run(fn: () => Promise<string | void | null>): Promise<CartActionResult> {
  if (!(await rateLimit("cart", 120, 60))) return { ok: false, error: "Too many requests, please slow down" };
  try {
    const msg = await fn();
    return { ok: true, cart: await getCartView(), message: msg ?? undefined };
  } catch (err) {
    if (err instanceof CartError || err instanceof z.ZodError) {
      return { ok: false, error: err instanceof z.ZodError ? "Invalid request" : err.message, cart: await getCartView() };
    }
    console.error("[cart]", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function getCartAction(): Promise<CartView> {
  return getCartView();
}

export async function addToCartAction(variantId: string, quantity = 1) {
  return run(async () => {
    await addItem(id.parse(variantId), z.number().int().min(1).max(5).parse(quantity));
    return "Added to your bag";
  });
}

export async function updateCartItemAction(itemId: string, quantity: number) {
  return run(() => setItemQuantity(id.parse(itemId), z.number().int().min(0).max(5).parse(quantity)));
}

export async function removeCartItemAction(itemId: string) {
  return run(() => removeItem(id.parse(itemId)));
}

export async function applyCouponAction(code: string) {
  return run(async () => {
    const error = await setCoupon(z.string().max(40).parse(code));
    if (error) throw new CartError(error);
    return "Coupon applied";
  });
}

export async function removeCouponAction() {
  return run(() => setCoupon(null));
}
