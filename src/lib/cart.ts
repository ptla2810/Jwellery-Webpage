import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getCurrentUser } from "./auth/session";
import { ensureGuestToken, readGuestToken } from "./guest";
import { loadCoupon } from "./coupons";
import { quote, type DeliveryOption, type PaymentChoice, type PriceQuote, type CouponRule } from "./pricing";
import { getSetting } from "./settings";
import { metalSummary } from "./catalog/labels";

export const MAX_QTY_PER_ITEM = 5;

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      variant: {
        include: {
          inventory: true,
          product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  sku: string;
  variantName: string;
  size: string | null;
  image: { url: string; alt: string } | null;
  metal: string;
  unitPrice: number;
  compareAtPrice: number | null;
  quantity: number;
  stock: number;
  issue: string | null;
};

export type CartView = {
  id: string | null;
  lines: CartLine[];
  count: number;
  quote: PriceQuote;
  couponInput: string | null;
  hasIssues: boolean;
};

export async function cartOwner(): Promise<{ userId: string } | { guestToken: string } | null> {
  const user = await getCurrentUser();
  if (user) return { userId: user.id };
  const guestToken = await readGuestToken();
  return guestToken ? { guestToken } : null;
}

async function findCart(): Promise<CartWithItems | null> {
  const owner = await cartOwner();
  if (!owner) return null;
  return prisma.cart.findUnique({ where: owner as Prisma.CartWhereUniqueInput, include: cartInclude });
}

/** For mutations: returns the existing cart or creates one (setting a guest cookie if needed). */
export async function getOrCreateCartId(): Promise<string> {
  const user = await getCurrentUser();
  if (user) {
    const cart = await prisma.cart.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {}, select: { id: true } });
    return cart.id;
  }
  const guestToken = await ensureGuestToken();
  const cart = await prisma.cart.upsert({ where: { guestToken }, create: { guestToken }, update: {}, select: { id: true } });
  return cart.id;
}

function toLines(cart: CartWithItems | null): CartLine[] {
  if (!cart) return [];
  return cart.items.map((item) => {
    const v = item.variant;
    const p = v.product;
    const stock = v.inventory?.quantity ?? 0;
    let issue: string | null = null;
    if (p.status !== "ACTIVE" || !v.isActive) issue = "This item is no longer available";
    else if (stock <= 0) issue = "Out of stock";
    else if (item.quantity > stock) issue = `Only ${stock} left in stock`;
    return {
      id: item.id,
      variantId: v.id,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      sku: v.sku,
      variantName: v.name,
      size: v.size,
      image: p.images[0] ? { url: p.images[0].url, alt: p.images[0].alt } : null,
      metal: metalSummary(p.metalType, p.purity),
      unitPrice: v.price,
      compareAtPrice: v.compareAtPrice,
      quantity: item.quantity,
      stock,
      issue,
    };
  });
}

export async function priceLines(
  lines: Pick<CartLine, "id" | "unitPrice" | "compareAtPrice" | "quantity">[],
  opts: { coupon?: CouponRule | null; deliveryOption?: DeliveryOption; paymentMethod?: PaymentChoice } = {},
) {
  const [shipping, tax] = await Promise.all([getSetting("shipping"), getSetting("tax")]);
  return quote({
    lines: lines.map((l) => ({ key: l.id, unitPrice: l.unitPrice, compareAtPrice: l.compareAtPrice, quantity: l.quantity })),
    coupon: opts.coupon,
    shipping,
    tax,
    deliveryOption: opts.deliveryOption,
    paymentMethod: opts.paymentMethod,
  });
}

export async function getCartView(opts: { deliveryOption?: DeliveryOption; paymentMethod?: PaymentChoice } = {}): Promise<CartView> {
  const cart = await findCart();
  const lines = toLines(cart);
  const purchasable = lines.filter((l) => !l.issue);
  let coupon: CouponRule | null = null;
  let couponError: string | null = null;
  if (cart?.couponCode) {
    const user = await getCurrentUser();
    const r = await loadCoupon(cart.couponCode, user?.id ?? null);
    if (r.ok) coupon = r.rule;
    else couponError = r.error;
  }
  const q = await priceLines(purchasable, { coupon, ...opts });
  if (couponError) q.couponError = couponError;
  return {
    id: cart?.id ?? null,
    lines,
    count: lines.reduce((a, l) => a + l.quantity, 0),
    quote: q,
    couponInput: cart?.couponCode ?? null,
    hasIssues: lines.some((l) => l.issue),
  };
}

export async function cartCount(): Promise<number> {
  const owner = await cartOwner();
  if (!owner) return 0;
  const agg = await prisma.cartItem.aggregate({
    where: { cart: owner as Prisma.CartWhereInput },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

export class CartError extends Error {}

export async function addItem(variantId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_ITEM) throw new CartError("Invalid quantity");
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { inventory: true, product: { select: { status: true } } },
  });
  if (!variant || !variant.isActive || variant.product.status !== "ACTIVE") throw new CartError("This item is not available");
  const stock = variant.inventory?.quantity ?? 0;
  if (stock <= 0) throw new CartError("Sorry, this item is out of stock");
  const cartId = await getOrCreateCartId();
  const existing = await prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId } } });
  const next = (existing?.quantity ?? 0) + quantity;
  if (next > Math.min(stock, MAX_QTY_PER_ITEM)) {
    throw new CartError(stock < MAX_QTY_PER_ITEM ? `Only ${stock} available` : `You can add up to ${MAX_QTY_PER_ITEM} of this item`);
  }
  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId, variantId } },
    create: { cartId, variantId, quantity },
    update: { quantity: next },
  });
  await prisma.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
}

async function ownedItem(itemId: string) {
  const owner = await cartOwner();
  if (!owner) throw new CartError("Cart not found");
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: owner as Prisma.CartWhereInput },
    include: { variant: { include: { inventory: true } } },
  });
  if (!item) throw new CartError("Item not found in your cart");
  return item;
}

export async function setItemQuantity(itemId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QTY_PER_ITEM) throw new CartError("Invalid quantity");
  const item = await ownedItem(itemId);
  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return;
  }
  const stock = item.variant.inventory?.quantity ?? 0;
  if (quantity > stock) throw new CartError(stock > 0 ? `Only ${stock} available` : "Out of stock");
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
}

export async function removeItem(itemId: string) {
  const item = await ownedItem(itemId);
  await prisma.cartItem.delete({ where: { id: item.id } });
}

export async function setCoupon(code: string | null): Promise<string | null> {
  const cartId = await getOrCreateCartId();
  if (!code) {
    await prisma.cart.update({ where: { id: cartId }, data: { couponCode: null } });
    return null;
  }
  const user = await getCurrentUser();
  const r = await loadCoupon(code, user?.id ?? null);
  if (!r.ok) return r.error;
  await prisma.cart.update({ where: { id: cartId }, data: { couponCode: r.rule.code } });
  return null;
}

/** Merge a guest cart & wishlist into the user's after login/registration. */
export async function mergeGuestData(userId: string, guestToken: string | null) {
  if (!guestToken) return;
  await prisma.$transaction(async (tx) => {
    const guestCart = await tx.cart.findUnique({
      where: { guestToken },
      include: { items: { include: { variant: { include: { inventory: true } } } } },
    });
    if (guestCart) {
      const userCart = await tx.cart.upsert({ where: { userId }, create: { userId }, update: {}, include: { items: true } });
      for (const gi of guestCart.items) {
        const cap = Math.min(gi.variant.inventory?.quantity ?? 0, MAX_QTY_PER_ITEM);
        if (cap <= 0) continue;
        const existing = userCart.items.find((i) => i.variantId === gi.variantId);
        const quantity = Math.min(cap, (existing?.quantity ?? 0) + gi.quantity);
        await tx.cartItem.upsert({
          where: { cartId_variantId: { cartId: userCart.id, variantId: gi.variantId } },
          create: { cartId: userCart.id, variantId: gi.variantId, quantity },
          update: { quantity },
        });
      }
      if (guestCart.couponCode && !userCart.couponCode) {
        await tx.cart.update({ where: { id: userCart.id }, data: { couponCode: guestCart.couponCode } });
      }
      await tx.cart.delete({ where: { id: guestCart.id } });
    }
    const guestWl = await tx.wishlist.findUnique({ where: { guestToken }, include: { items: true } });
    if (guestWl) {
      const wl = await tx.wishlist.upsert({ where: { userId }, create: { userId }, update: {} });
      for (const it of guestWl.items) {
        await tx.wishlistItem.upsert({
          where: { wishlistId_productId: { wishlistId: wl.id, productId: it.productId } },
          create: { wishlistId: wl.id, productId: it.productId },
          update: {},
        });
      }
      await tx.wishlist.delete({ where: { id: guestWl.id } });
    }
  });
}
