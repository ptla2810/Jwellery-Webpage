import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { OrderDetail } from "@/components/order/OrderDetail";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

export default async function AccountOrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const user = await requireUser(`/account/orders/${orderNumber}`);
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order || order.userId !== user.id) notFound();
  return <OrderDetail orderId={order.id} canManage />;
}
