import Link from "next/link";
import { notFound } from "next/navigation";
import type { ShipmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermissionPage, hasPermission } from "@/lib/auth/session";
import { ADMIN_TRANSITIONS, ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { formatINR } from "@/lib/money";
import { Card, PageHeader, Pill, Table, statusTone } from "@/components/admin/ui";
import { ActionButton, AdminForm, AField, inputCls } from "@/components/admin/forms";
import { addNoteAction, addShipmentAction, changeStatusAction, recordRefundAction, updateRefundAction, updateReturnAction, updateShipmentAction } from "../actions";

export const metadata = { title: "Order" };
const SHIP_NEXT: Partial<Record<ShipmentStatus, ShipmentStatus>> = { PENDING: "PACKED", PACKED: "IN_TRANSIT", IN_TRANSIT: "OUT_FOR_DELIVERY", OUT_FOR_DELIVERY: "DELIVERED" };

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermissionPage("orders.read", `/admin/orders/${id}`);
  const o = await prisma.order.findUnique({
    where: { id },
    include: { items: true, payments: { orderBy: { createdAt: "desc" } }, shipments: { orderBy: { createdAt: "desc" } }, refunds: { orderBy: { createdAt: "desc" } }, events: { orderBy: { createdAt: "desc" } }, returnRequests: { include: { orderItem: true } }, user: true },
  });
  if (!o) notFound();
  const actors = await prisma.user.findMany({ where: { id: { in: o.events.map((e) => e.actorId).filter(Boolean) as string[] } }, select: { id: true, name: true } });
  const canWrite = hasPermission(user, "orders.write");
  const canRefund = hasPermission(user, "refunds.write");
  const addr = o.shippingAddress as Record<string, string>;
  const transitions = ADMIN_TRANSITIONS[o.status];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Order ${o.orderNumber}`}
        back={{ href: "/admin/orders", label: "Orders" }}
        description={<span className="flex flex-wrap items-center gap-2">Placed {o.placedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} <Pill tone={statusTone(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Pill> <Pill tone={o.paymentStatus === "PAID" ? "good" : "neutral"}>Payment {o.paymentStatus.toLowerCase().replace("_", " ")}</Pill></span>}
        actions={canWrite && transitions.map((t) => (
          <ActionButton key={t} action={changeStatusAction.bind(null, o.id, t, undefined)} label={t === "CANCELLED" ? "Cancel order" : `Mark ${ORDER_STATUS_LABEL[t].toLowerCase()}`} variant={t === "CANCELLED" ? "danger" : "primary"} confirmText={t === "CANCELLED" ? "Cancel this order? Stock will be released and a refund record created if paid." : undefined} />
        ))}
      />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card title="Items">
            <Table>
              <thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th className="text-right">Unit</th><th className="text-right">Line total</th></tr></thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id}><td>{i.productName}<p className="text-xs text-muted">{i.metalSummary} · {i.variantName}</p></td><td className="text-xs">{i.sku}</td><td>{i.quantity}</td><td className="text-right tabular-nums">{formatINR(i.unitPrice)}</td><td className="text-right tabular-nums">{formatINR(i.lineTotal)}</td></tr>
                ))}
              </tbody>
            </Table>
            <dl className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatINR(o.subtotal)}</dd></div>
              {o.discountTotal > 0 && <div className="flex justify-between"><dt className="text-muted">Discount ({o.couponCode})</dt><dd>− {formatINR(o.discountTotal)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Shipping ({o.deliveryOption})</dt><dd>{formatINR(o.shippingFee)}</dd></div>
              {o.codFee > 0 && <div className="flex justify-between"><dt className="text-muted">COD fee</dt><dd>{formatINR(o.codFee)}</dd></div>}
              <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatINR(o.total)}</dd></div>
              <div className="flex justify-between text-xs text-muted"><dt>GST included</dt><dd>{formatINR(o.taxTotal, { exact: true })}</dd></div>
            </dl>
          </Card>

          <Card title="Shipments">
            {o.shipments.map((s) => (
              <div key={s.id} className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 text-sm">
                <div>{s.carrier} {s.trackingNumber && <span className="text-muted">· {s.trackingNumber}</span>} <Pill tone="info">{s.status.replace(/_/g, " ").toLowerCase()}</Pill></div>
                {canWrite && SHIP_NEXT[s.status] && <ActionButton action={updateShipmentAction.bind(null, s.id, SHIP_NEXT[s.status]!)} label={`Mark ${SHIP_NEXT[s.status]!.replace(/_/g, " ").toLowerCase()}`} />}
              </div>
            ))}
            {canWrite && ["CONFIRMED", "PROCESSING", "SHIPPED"].includes(o.status) && (
              <AdminForm action={addShipmentAction} submitLabel="Add shipment">
                <input type="hidden" name="orderId" value={o.id} />
                <div className="grid gap-3 md:grid-cols-3">
                  <AField label="Carrier"><input name="carrier" className={inputCls} placeholder="e.g. Blue Dart" /></AField>
                  <AField label="Tracking number"><input name="trackingNumber" className={inputCls} /></AField>
                  <AField label="Tracking URL"><input name="trackingUrl" className={inputCls} placeholder="https://" /></AField>
                </div>
              </AdminForm>
            )}
            {!o.shipments.length && !canWrite && <p className="text-sm text-muted">No shipments.</p>}
          </Card>

          <Card title="Payments & refunds">
            <ul className="space-y-2 text-sm">
              {o.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap justify-between gap-2"><span>{p.provider} · {p.providerPaymentId ?? p.providerOrderId} {p.method && `· ${p.method}`}</span><span><Pill tone={p.status === "CAPTURED" ? "good" : p.status === "FAILED" ? "bad" : "neutral"}>{p.status.toLowerCase()}</Pill> {formatINR(p.amount)}</span>{p.errorReason && <span className="w-full text-xs text-danger">{p.errorReason}</span>}</li>
              ))}
              {!o.payments.length && <li className="text-muted">{o.paymentMethod === "COD" ? "Cash on delivery — collected on delivery." : "No payment attempts."}</li>}
            </ul>
            {o.refunds.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
                {o.refunds.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>Refund {formatINR(r.amount)} {r.reason && <span className="text-muted">— {r.reason}</span>}</span>
                    <span className="flex items-center gap-2">
                      <Pill tone={r.status === "COMPLETED" ? "good" : r.status === "FAILED" ? "bad" : "warn"}>{r.status.toLowerCase()}</Pill>
                      {canRefund && r.status !== "COMPLETED" && <ActionButton action={updateRefundAction.bind(null, r.id, "COMPLETED")} label="Mark completed" />}
                      {canRefund && r.status !== "COMPLETED" && r.status !== "FAILED" && <ActionButton action={updateRefundAction.bind(null, r.id, "FAILED")} label="Failed" variant="ghost" />}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {canRefund && o.paymentStatus !== "PENDING" && o.paymentStatus !== "FAILED" && (
              <div className="mt-4 border-t border-line pt-4">
                <AdminForm action={recordRefundAction} submitLabel="Record refund">
                  <input type="hidden" name="orderId" value={o.id} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <AField label="Amount (₹)"><input name="amount" inputMode="decimal" className={inputCls} /></AField>
                    <AField label="Reason"><input name="reason" className={inputCls} /></AField>
                  </div>
                </AdminForm>
              </div>
            )}
          </Card>

          {o.returnRequests.length > 0 && (
            <Card title="Returns & exchanges">
              {o.returnRequests.map((r) => (
                <div key={r.id} className="mb-4 border-b border-line pb-4 text-sm">
                  <p><strong>{r.type}</strong> · {r.orderItem.productName} — {r.reason} <Pill>{r.status.toLowerCase()}</Pill></p>
                  {r.details && <p className="text-muted">{r.details}</p>}
                  {canWrite && (
                    <AdminForm action={updateReturnAction} submitLabel="Update request" className="mt-2">
                      <input type="hidden" name="id" value={r.id} />
                      <div className="grid gap-3 md:grid-cols-2">
                        <select name="status" defaultValue={r.status} className={inputCls} aria-label="Return status">{["REQUESTED", "APPROVED", "REJECTED", "RECEIVED", "COMPLETED"].map((s) => <option key={s}>{s}</option>)}</select>
                        <input name="adminNote" defaultValue={r.adminNote ?? ""} placeholder="Note to customer" className={inputCls} />
                      </div>
                    </AdminForm>
                  )}
                </div>
              ))}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Customer">
            <p className="text-sm font-medium">{o.customerName}</p>
            <p className="text-sm text-muted">{o.email} · {o.phone}</p>
            {o.user ? <Link href={`/admin/customers/${o.user.id}`} className="text-xs text-gold">View customer →</Link> : <p className="text-xs text-muted">Guest checkout</p>}
            {o.customerNote && <p className="mt-3 rounded bg-cream p-2 text-sm">“{o.customerNote}”</p>}
          </Card>
          <Card title="Shipping address">
            <p className="text-sm">{addr.fullName}<br />{addr.line1}{addr.line2 && <>, {addr.line2}</>}{addr.landmark && <> ({addr.landmark})</>}<br />{addr.city}, {addr.state} {addr.postalCode}<br />{addr.phone}</p>
          </Card>
          <Card title="Notes & history">
            {canWrite && (
              <AdminForm action={addNoteAction} submitLabel="Add note">
                <input type="hidden" name="orderId" value={o.id} />
                <textarea name="message" rows={2} className={inputCls} aria-label="Note" placeholder="Add a note…" />
                <select name="visibility" className={inputCls} aria-label="Visibility"><option value="internal">Internal only</option><option value="customer">Visible to customer</option></select>
              </AdminForm>
            )}
            <ol className="mt-4 space-y-3 border-l border-line pl-4 text-sm">
              {o.events.map((e) => (
                <li key={e.id}>
                  <p>{e.message} {e.isInternal && <Pill>internal</Pill>}</p>
                  <p className="text-xs text-muted">{e.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}{e.actorId && ` · ${actors.find((a) => a.id === e.actorId)?.name ?? "staff"}`}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
