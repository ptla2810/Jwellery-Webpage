import "server-only";
import { cookies } from "next/headers";
import { hmac, safeEqual } from "../auth/tokens";
import { getCurrentUser } from "../auth/session";
import { isProduction } from "../env";
import { prisma } from "../db";

const COOKIE = "aurelle_orders";

/** Guests get a signed cookie listing the orders they placed in this browser. */
export async function grantOrderAccess(orderNumber: string) {
  const store = await cookies();
  const current = (store.get(COOKIE)?.value ?? "").split(".").filter(Boolean);
  const entry = `${orderNumber}:${hmac(orderNumber, "order-access")}`;
  const next = [entry, ...current.filter((e) => !e.startsWith(`${orderNumber}:`))].slice(0, 10);
  store.set(COOKIE, next.join("."), { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/", maxAge: 30 * 86_400 });
}

async function hasCookieAccess(orderNumber: string) {
  const entries = ((await cookies()).get(COOKIE)?.value ?? "").split(".");
  const expected = hmac(orderNumber, "order-access");
  return entries.some((e) => {
    const [num, sig] = e.split(":");
    return num === orderNumber && !!sig && safeEqual(sig, expected);
  });
}

/** Returns the order if the current visitor owns it (signed-in owner or guest cookie). */
export async function findAccessibleOrder(orderNumber: string) {
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) return null;
  const user = await getCurrentUser();
  if (user && order.userId === user.id) return order;
  if (!order.userId && (await hasCookieAccess(orderNumber))) return order;
  if (order.userId && !user && (await hasCookieAccess(orderNumber))) return order;
  return null;
}
