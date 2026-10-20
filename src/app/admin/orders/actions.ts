"use server";

import { OrderStatus, RefundStatus, ReturnStatus, ShipmentStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertPermission } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { changeOrderStatus, CheckoutError } from "@/lib/orders/service";
import { rupeesToPaise } from "@/lib/money";
import type { AdminState } from "@/components/admin/forms";

async function guard(perm: "orders.write" | "refunds.write") {
  try {
    return { user: await assertPermission(perm) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function changeStatusAction(orderId: string, to: OrderStatus, note?: string): Promise<AdminState> {
  const g = await guard("orders.write");
  if (!g.user) return { error: g.error };
  try {
    if (to === "SHIPPED") {
      const shipments = await prisma.shipment.count({ where: { orderId } });
      if (!shipments) return { error: "Add shipment details before marking the order as shipped" };
    }
    const r = await changeOrderStatus(orderId, to, { id: g.user.id, admin: true }, note);
    await audit(g.user.id, "order.status", "Order", orderId, { from: r.from, to: r.to });
    return { ok: true, message: `Order marked ${to.toLowerCase().replace("_", " ")}` };
  } catch (err) {
    return { error: err instanceof CheckoutError ? err.message : "Could not update status" };
  }
}

export async function addShipmentAction(_: AdminState, form: FormData): Promise<AdminState> {
  const g = await guard("orders.write");
  if (!g.user) return { error: g.error };
  const parsed = z
    .object({
      orderId: z.string(),
      carrier: z.string().trim().min(2, "Carrier required").max(60),
      trackingNumber: z.string().trim().max(60).optional(),
      trackingUrl: z.union([z.literal(""), z.string().url("Enter a valid URL").refine((u) => /^https?:\/\//.test(u), "Must be http(s)")]).optional(),
    })
    .safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const order = await prisma.order.findUnique({ where: { id: d.orderId } });
  if (!order || ["CANCELLED", "PENDING_PAYMENT", "PAYMENT_FAILED"].includes(order.status)) return { error: "Shipments can only be added to confirmed orders" };
  await prisma.shipment.create({ data: { orderId: d.orderId, carrier: d.carrier, trackingNumber: d.trackingNumber || null, trackingUrl: d.trackingUrl || null, status: "PACKED" } });
  await prisma.orderEvent.create({ data: { orderId: d.orderId, type: "SHIPMENT", message: `Shipment created with ${d.carrier}${d.trackingNumber ? ` (${d.trackingNumber})` : ""}`, actorId: g.user.id } });
  await audit(g.user.id, "order.shipment.add", "Order", d.orderId, { carrier: d.carrier });
  return { ok: true, message: "Shipment added" };
}

export async function updateShipmentAction(shipmentId: string, status: ShipmentStatus): Promise<AdminState> {
  const g = await guard("orders.write");
  if (!g.user) return { error: g.error };
  const s = await prisma.shipment.update({ where: { id: shipmentId }, data: { status, ...(status === "IN_TRANSIT" ? { shippedAt: new Date() } : {}), ...(status === "DELIVERED" ? { deliveredAt: new Date() } : {}) } });
  await prisma.orderEvent.create({ data: { orderId: s.orderId, type: "SHIPMENT", message: `Shipment ${status.replace(/_/g, " ").toLowerCase()}`, actorId: g.user.id } });
  await audit(g.user.id, "order.shipment.update", "Order", s.orderId, { status });
  return { ok: true, message: "Shipment updated" };
}

export async function addNoteAction(_: AdminState, form: FormData): Promise<AdminState> {
  const g = await guard("orders.write");
  if (!g.user) return { error: g.error };
  const orderId = String(form.get("orderId"));
  const message = String(form.get("message") ?? "").trim().slice(0, 1000);
  if (message.length < 2) return { error: "Write a note" };
  const internal = form.get("visibility") !== "customer";
  await prisma.orderEvent.create({ data: { orderId, type: "NOTE", message, isInternal: internal, actorId: g.user.id } });
  return { ok: true, message: internal ? "Internal note added" : "Customer-visible update added" };
}

export async function recordRefundAction(_: AdminState, form: FormData): Promise<AdminState> {
  const g = await guard("refunds.write");
  if (!g.user) return { error: g.error };
  const orderId = String(form.get("orderId"));
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { refunds: true, payments: { where: { status: "CAPTURED" } } } });
  if (!order) return { error: "Order not found" };
  let amount: number;
  try {
    amount = rupeesToPaise(String(form.get("amount") ?? ""));
  } catch {
    return { error: "Enter a valid amount" };
  }
  const already = order.refunds.filter((r) => r.status !== "FAILED").reduce((a, r) => a + r.amount, 0);
  if (amount <= 0 || amount + already > order.total) return { error: `Refund must be between ₹1 and ${(order.total - already) / 100} (remaining refundable)` };
  await prisma.refund.create({ data: { orderId, paymentId: order.payments[0]?.id ?? null, amount, reason: String(form.get("reason") ?? "").slice(0, 200) || null, status: "PROCESSING" } });
  await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: "REFUND_PENDING" } });
  await prisma.orderEvent.create({ data: { orderId, type: "REFUND", message: `Refund of ₹${amount / 100} initiated`, actorId: g.user.id } });
  await audit(g.user.id, "order.refund.create", "Order", orderId, { amount });
  return { ok: true, message: "Refund recorded. Process it in your payment provider dashboard, then mark it completed." };
}

export async function updateRefundAction(refundId: string, status: RefundStatus): Promise<AdminState> {
  const g = await guard("refunds.write");
  if (!g.user) return { error: g.error };
  const refund = await prisma.refund.update({ where: { id: refundId }, data: { status } });
  const order = await prisma.order.findUniqueOrThrow({ where: { id: refund.orderId }, include: { refunds: true } });
  const done = order.refunds.filter((r) => r.status === "COMPLETED").reduce((a, r) => a + r.amount, 0);
  const pending = order.refunds.some((r) => r.status === "REQUESTED" || r.status === "PROCESSING");
  const paymentStatus = done >= order.total ? "REFUNDED" : pending ? "REFUND_PENDING" : done > 0 ? "PARTIALLY_REFUNDED" : order.paymentStatus;
  await prisma.order.update({ where: { id: order.id }, data: { paymentStatus } });
  await prisma.orderEvent.create({ data: { orderId: order.id, type: "REFUND", message: `Refund ${status.toLowerCase()}`, actorId: g.user.id } });
  await audit(g.user.id, "order.refund.update", "Order", order.id, { refundId, status });
  return { ok: true, message: "Refund updated" };
}

export async function updateReturnAction(_: AdminState, form: FormData): Promise<AdminState> {
  const g = await guard("orders.write");
  if (!g.user) return { error: g.error };
  const id = String(form.get("id"));
  const status = z.nativeEnum(ReturnStatus).safeParse(form.get("status"));
  if (!status.success) return { error: "Choose a status" };
  const note = String(form.get("adminNote") ?? "").trim().slice(0, 500) || null;
  const rr = await prisma.returnRequest.findUnique({ where: { id }, include: { orderItem: true } });
  if (!rr) return { error: "Request not found" };
  await prisma.$transaction(async (tx) => {
    await tx.returnRequest.update({ where: { id }, data: { status: status.data, adminNote: note } });
    if (status.data === "RECEIVED" && rr.status !== "RECEIVED" && rr.orderItem.variantId) {
      await tx.inventory.updateMany({ where: { variantId: rr.orderItem.variantId }, data: { quantity: { increment: rr.orderItem.quantity } } });
      await tx.inventoryMovement.create({ data: { variantId: rr.orderItem.variantId, delta: rr.orderItem.quantity, reason: "RETURNED", reference: rr.orderId, actorId: g.user!.id } });
    }
    await tx.orderEvent.create({ data: { orderId: rr.orderId, type: "RETURN", message: `${rr.type === "RETURN" ? "Return" : "Exchange"} ${status.data.toLowerCase()}${note ? `: ${note}` : ""}`, actorId: g.user!.id } });
  });
  await audit(g.user.id, "return.update", "ReturnRequest", id, { status: status.data });
  return { ok: true, message: "Return request updated" };
}

