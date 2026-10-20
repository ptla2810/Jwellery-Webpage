import Link from "next/link";
import { Check, Package } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatDateRange } from "@/lib/delivery";
import { CUSTOMER_TIMELINE, ORDER_STATUS_LABEL, RETURN_WINDOW_DAYS } from "@/lib/orders/status";
import { paymentSimulatorEnabled } from "@/lib/env";
import { Badge } from "@/components/ui/misc";
import { ProductImage } from "@/components/ui/ProductImage";
import { CancelOrderButton, RetryPayment, ReturnRequestForm } from "./OrderActions";
import { cn } from "@/lib/cn";
import { isWithinDays } from "@/lib/time";

const PAYMENT_LABEL: Record<string, string> = {
  PENDING: "Pending",
  AUTHORIZED: "Authorised",
  PAID: "Paid",
  FAILED: "Failed",
  REFUND_PENDING: "Refund pending",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded",
};

export async function OrderDetail({ orderId, canManage }: { orderId: string; canManage: boolean }) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: true,
      shipments: { orderBy: { createdAt: "desc" } },
      events: { where: { isInternal: false }, orderBy: { createdAt: "asc" } },
      returnRequests: { include: { orderItem: true } },
      refunds: true,
    },
  });
  const addr = order.shippingAddress as Record<string, string>;
  const currentIdx = CUSTOMER_TIMELINE.indexOf(order.status);
  const deliveredAt = order.shipments.find((s) => s.deliveredAt)?.deliveredAt;
  const canReturn = canManage && order.status === "DELIVERED" && (!deliveredAt || isWithinDays(deliveredAt, RETURN_WINDOW_DAYS));
  const stepDate = (s: string) => order.events.find((e) => e.toStatus === s)?.createdAt;

  return (
    <div className="space-y-10" data-testid="order-detail">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Order</p>
          <h1 className="mt-1 text-4xl" data-testid="order-number">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted">Placed {order.placedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={order.status === "CANCELLED" || order.status === "PAYMENT_FAILED" ? "danger" : order.status === "DELIVERED" ? "success" : "gold"}>
            <span data-testid="order-status">{ORDER_STATUS_LABEL[order.status]}</span>
          </Badge>
          <Badge tone={order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "FAILED" ? "danger" : "neutral"}>Payment: {PAYMENT_LABEL[order.paymentStatus]}</Badge>
        </div>
      </div>

      {order.status === "PENDING_PAYMENT" && (
        <div className="border border-gold-300 bg-gold-100/50 p-5">
          <p className="font-semibold">Awaiting payment</p>
          <p className="mb-4 mt-1 text-sm text-muted">Your items are reserved for 30 minutes from when the order was placed. Complete payment to confirm your order.</p>
          <RetryPayment orderNumber={order.orderNumber} simulator={order.paymentMethod === "TEST_SIMULATOR" && paymentSimulatorEnabled()} />
        </div>
      )}
      {order.status === "PAYMENT_FAILED" && (
        <div className="border border-danger/30 bg-danger/5 p-5 text-sm">
          The payment window for this order has closed and reserved items were released. If you were charged, the amount will be refunded. <Link href="/cart" className="font-semibold underline">Return to your bag</Link> to try again.
        </div>
      )}

      {!["CANCELLED", "PAYMENT_FAILED", "PENDING_PAYMENT"].includes(order.status) && (
        <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
          {CUSTOMER_TIMELINE.map((s, i) => {
            const done = i <= currentIdx;
            const date = stepDate(s);
            return (
              <li key={s} className="flex flex-col items-center gap-2 text-center">
                <span className={cn("flex size-8 items-center justify-center rounded-full border", done ? "border-ink bg-ink text-ivory" : "border-line text-muted")}>
                  {done ? <Check className="size-4" /> : <Package className="size-4" />}
                </span>
                <span className={cn("text-xs", done ? "font-semibold" : "text-muted")}>{ORDER_STATUS_LABEL[s]}</span>
                {date && <span className="text-[0.65rem] text-muted">{date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
              </li>
            );
          })}
        </ol>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="mb-4 text-2xl">Items</h2>
          <ul className="divide-y divide-line border-y border-line">
            {order.items.map((i) => (
              <li key={i.id} className="flex gap-4 py-4">
                <span className="relative h-24 w-20 shrink-0 overflow-hidden bg-cream">{i.imageUrl && <ProductImage src={i.imageUrl} alt="" fill sizes="80px" className="object-cover" />}</span>
                <div className="flex-1 text-sm">
                  <Link href={`/products/${i.productSlug}`} className="font-display text-lg hover:text-gold">{i.productName}</Link>
                  <p className="text-muted">{i.metalSummary}{i.variantName !== "Standard" && ` · ${i.variantName}`}</p>
                  <p className="text-muted">SKU {i.sku} · Qty {i.quantity} · {formatINR(i.unitPrice)} each</p>
                </div>
                <p className="text-sm font-semibold">{formatINR(i.lineTotal)}</p>
              </li>
            ))}
          </ul>
          {order.returnRequests.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-lg">Return &amp; exchange requests</h3>
              <ul className="space-y-2 text-sm">
                {order.returnRequests.map((r) => (
                  <li key={r.id} className="border border-line bg-white p-3">
                    {r.type === "RETURN" ? "Return" : "Exchange"} · {r.orderItem.productName} — <strong>{r.status.toLowerCase()}</strong>
                    {r.adminNote && <p className="text-muted">{r.adminNote}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {canManage && order.status === "CONFIRMED" && <CancelOrderButton orderNumber={order.orderNumber} />}
            {canReturn && <ReturnRequestForm orderNumber={order.orderNumber} items={order.items.map((i) => ({ id: i.id, name: i.productName }))} />}
          </div>
        </div>

        <div className="space-y-6">
          <section className="border border-line bg-white p-5">
            <h2 className="mb-3 text-xl">Payment summary</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
              {order.discountTotal > 0 && <div className="flex justify-between"><dt className="text-muted">Discount {order.couponCode && `(${order.couponCode})`}</dt><dd className="text-success">− {formatINR(order.discountTotal)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{order.shippingFee ? formatINR(order.shippingFee) : "Free"}</dd></div>
              {order.codFee > 0 && <div className="flex justify-between"><dt className="text-muted">COD fee</dt><dd>{formatINR(order.codFee)}</dd></div>}
              <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div>
              <p className="text-xs text-muted">Includes GST of {formatINR(order.taxTotal, { exact: true })}</p>
              <p className="pt-2 text-xs text-muted">Payment method: {order.paymentMethod === "COD" ? "Cash on delivery" : order.paymentMethod === "RAZORPAY" ? "Online (Razorpay)" : "Test payment"}</p>
            </dl>
            {order.refunds.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-muted">
                {order.refunds.map((r) => <li key={r.id}>Refund of {formatINR(r.amount)} — {r.status.toLowerCase()}</li>)}
              </ul>
            )}
          </section>
          <section className="border border-line bg-white p-5 text-sm">
            <h2 className="mb-3 text-xl">Delivery</h2>
            <p className="font-semibold">{addr.fullName}</p>
            <p className="text-muted">{addr.line1}{addr.line2 && `, ${addr.line2}`}{addr.landmark && ` (${addr.landmark})`}</p>
            <p className="text-muted">{addr.city}, {addr.state} {addr.postalCode}</p>
            <p className="text-muted">{addr.phone}</p>
            {order.estimatedDeliveryFrom && order.estimatedDeliveryTo && !["CANCELLED", "DELIVERED", "PAYMENT_FAILED"].includes(order.status) && (
              <p className="mt-3">Estimated delivery: <strong>{formatDateRange(order.estimatedDeliveryFrom, order.estimatedDeliveryTo)}</strong></p>
            )}
            {order.shipments.map((s) => (
              <div key={s.id} className="mt-3 border-t border-line pt-3">
                <p>{s.carrier} {s.trackingNumber && `· ${s.trackingNumber}`}</p>
                <p className="text-muted">Status: {s.status.replace(/_/g, " ").toLowerCase()}</p>
                {s.trackingUrl && /^https?:\/\//.test(s.trackingUrl) && <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-gold underline">Track shipment</a>}
              </div>
            ))}
          </section>
          {order.events.length > 0 && (
            <section className="text-sm">
              <h2 className="mb-3 text-xl">History</h2>
              <ol className="space-y-2 border-l border-line pl-4">
                {order.events.map((e) => (
                  <li key={e.id}>
                    <p>{e.message}</p>
                    <p className="text-xs text-muted">{e.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
