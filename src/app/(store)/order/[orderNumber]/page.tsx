import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { findAccessibleOrder } from "@/lib/orders/access";
import { getCurrentUser } from "@/lib/auth/session";
import { OrderDetail } from "@/components/order/OrderDetail";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ orderNumber: string }>; searchParams: Promise<{ placed?: string }> }) {
  const { orderNumber } = await params;
  const order = await findAccessibleOrder(orderNumber);
  if (!order) notFound();
  const user = await getCurrentUser();
  const placed = (await searchParams).placed === "1" && ["CONFIRMED", "PROCESSING"].includes(order.status);
  return (
    <div className="container-x py-10">
      {placed && (
        <div className="mb-10 flex flex-col items-center gap-3 border border-success/30 bg-success/5 px-6 py-10 text-center" role="status" data-testid="order-confirmation">
          <CheckCircle2 className="size-10 text-success" strokeWidth={1.4} />
          <h2 className="text-3xl">Thank you, {order.customerName.split(" ")[0]}!</h2>
          <p className="max-w-md text-sm text-muted">Your order is confirmed. A confirmation has been sent to {order.email}.</p>
        </div>
      )}
      <OrderDetail orderId={order.id} canManage={!!user && order.userId === user.id} />
    </div>
  );
}
