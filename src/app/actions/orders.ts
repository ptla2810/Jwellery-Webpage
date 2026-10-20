"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { changeOrderStatus, CheckoutError } from "@/lib/orders/service";
import { findAccessibleOrder, grantOrderAccess } from "@/lib/orders/access";
import { RETURN_WINDOW_DAYS } from "@/lib/orders/status";
import { rateLimit } from "@/lib/rate-limit";
import type { FormState } from "./engagement";

export async function cancelOrderAction(orderNumber: string): Promise<FormState> {
  const user = await getCurrentUser();
  const order = await findAccessibleOrder(String(orderNumber));
  if (!order || !user || order.userId !== user.id) return { error: "Please sign in to cancel this order" };
  try {
    await changeOrderStatus(order.id, "CANCELLED", { id: user.id, admin: false }, "Cancelled by customer");
    revalidatePath(`/account/orders/${order.orderNumber}`);
    return { ok: true, message: "Your order has been cancelled. Any payment will be refunded to the original method." };
  } catch (err) {
    return { error: err instanceof CheckoutError ? err.message : "Could not cancel this order" };
  }
}

const returnSchema = z.object({
  orderNumber: z.string().max(30),
  orderItemId: z.string().min(1).max(40),
  type: z.enum(["RETURN", "EXCHANGE"]),
  reason: z.string().trim().min(3, "Please choose a reason").max(120),
  details: z.string().trim().max(1000).optional(),
});

export async function requestReturnAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in" };
  const parsed = returnSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const order = await prisma.order.findUnique({ where: { orderNumber: parsed.data.orderNumber }, include: { items: true, shipments: true, returnRequests: true } });
  if (!order || order.userId !== user.id) return { error: "Order not found" };
  if (order.status !== "DELIVERED") return { error: "Returns can be requested after delivery" };
  const deliveredAt = order.shipments.find((s) => s.deliveredAt)?.deliveredAt ?? order.updatedAt;
  if (Date.now() - deliveredAt.getTime() > RETURN_WINDOW_DAYS * 86_400_000) return { error: `The ${RETURN_WINDOW_DAYS}-day return window has passed` };
  const item = order.items.find((i) => i.id === parsed.data.orderItemId);
  if (!item) return { error: "Item not found" };
  if (order.returnRequests.some((r) => r.orderItemId === item.id && r.status !== "REJECTED")) return { error: "A request already exists for this item" };
  await prisma.returnRequest.create({
    data: { orderId: order.id, orderItemId: item.id, userId: user.id, type: parsed.data.type, reason: parsed.data.reason, details: parsed.data.details || null },
  });
  await prisma.orderEvent.create({ data: { orderId: order.id, type: "RETURN", message: `${parsed.data.type === "RETURN" ? "Return" : "Exchange"} requested for ${item.productName}`, actorId: user.id } });
  revalidatePath(`/account/orders/${order.orderNumber}`);
  return { ok: true, message: "Request submitted. Our team will review it and contact you." };
}

export async function trackOrderAction(_: FormState, form: FormData): Promise<FormState & { orderNumber?: string }> {
  if (!(await rateLimit("track", 10, 600))) return { error: "Too many attempts. Please try again later." };
  const orderNumber = String(form.get("orderNumber") ?? "").trim().toUpperCase();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order || order.email !== email) return { error: "We couldn't find an order with those details" };
  await grantOrderAccess(order.orderNumber);
  return { ok: true, orderNumber: order.orderNumber };
}
