import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { findAccessibleOrder } from "@/lib/orders/access";
import { getSetting } from "@/lib/settings";
import { PayExisting } from "@/components/checkout/PayExisting";

export const metadata: Metadata = { title: "Complete payment", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const order = await findAccessibleOrder((await params).orderNumber);
  if (!order) notFound();
  if (order.status !== "PENDING_PAYMENT") redirect(`/order/${order.orderNumber}`);
  const store = await getSetting("store");
  return (
    <div className="container-x flex justify-center py-16">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-4xl">Complete your payment</h1>
        <p className="text-sm text-muted">Order {order.orderNumber}</p>
        <div className="flex justify-center">
          <PayExisting orderNumber={order.orderNumber} amount={order.total} storeName={store.name} prefill={{ name: order.customerName, email: order.email, contact: order.phone }} />
        </div>
      </div>
    </div>
  );
}
