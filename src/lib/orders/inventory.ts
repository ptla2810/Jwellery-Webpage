import type { Prisma } from "@prisma/client";
import { syncProductDerived } from "../catalog/sync";

export class OutOfStockError extends Error {
  constructor(public sku: string) {
    super(`Not enough stock for ${sku}`);
  }
}

/** Atomically decrement stock; throws if insufficient (prevents overselling under concurrency). */
export async function reserveStock(
  tx: Prisma.TransactionClient,
  items: { variantId: string; sku: string; quantity: number }[],
  reference: string,
) {
  for (const it of items) {
    const res = await tx.inventory.updateMany({
      where: { variantId: it.variantId, quantity: { gte: it.quantity } },
      data: { quantity: { decrement: it.quantity } },
    });
    if (res.count !== 1) throw new OutOfStockError(it.sku);
    await tx.inventoryMovement.create({
      data: { variantId: it.variantId, delta: -it.quantity, reason: "ORDER_PLACED", reference },
    });
  }
}

/** Return reserved stock for an order exactly once. */
export async function releaseOrderStock(tx: Prisma.TransactionClient, orderId: string, reason: "ORDER_CANCELLED" | "RETURNED" = "ORDER_CANCELLED") {
  const claimed = await tx.order.updateMany({ where: { id: orderId, inventoryReleased: false }, data: { inventoryReleased: true } });
  if (claimed.count === 0) return;
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, couponUsage: true } });
  const productIds = new Set<string>();
  for (const it of order.items) {
    if (!it.variantId) continue;
    await tx.inventory.updateMany({ where: { variantId: it.variantId }, data: { quantity: { increment: it.quantity } } });
    await tx.inventoryMovement.create({
      data: { variantId: it.variantId, delta: it.quantity, reason, reference: order.orderNumber },
    });
    if (it.productId) productIds.add(it.productId);
  }
  if (order.couponUsage) {
    await tx.couponUsage.delete({ where: { id: order.couponUsage.id } });
    await tx.coupon.update({ where: { id: order.couponUsage.couponId }, data: { usedCount: { decrement: 1 } } });
  }
  for (const id of productIds) {
    await tx.product.update({ where: { id }, data: { salesCount: { decrement: order.items.filter((i) => i.productId === id).reduce((a, i) => a + i.quantity, 0) } } });
    await syncProductDerived(tx, id);
  }
}
