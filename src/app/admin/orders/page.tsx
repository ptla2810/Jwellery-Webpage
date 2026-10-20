import Link from "next/link";
import type { Prisma, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { expireStalePendingOrders } from "@/lib/orders/service";
import { ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { formatINR } from "@/lib/money";
import { AdminPagination, FilterBar, PageHeader, Pill, Table, fieldCls, sp, statusTone } from "@/components/admin/ui";

export const metadata = { title: "Orders" };
const PER = 25;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermissionPage("orders.read", "/admin/orders");
  await expireStalePendingOrders();
  const s = await searchParams;
  const q = sp(s.q).trim();
  const status = sp(s.status);
  const payment = sp(s.payment);
  const page = Math.max(1, Number(sp(s.page)) || 1);
  const where: Prisma.OrderWhereInput = {
    ...(q ? { OR: [{ orderNumber: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
    ...(status ? { status: status as OrderStatus } : {}),
    ...(payment ? { paymentStatus: payment as "PAID" } : {}),
  };
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, orderBy: { placedAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { items: true } } } }),
  ]);
  return (
    <div>
      <PageHeader title="Orders" description={`${total} orders`} />
      <FilterBar action="/admin/orders">
        <input name="q" defaultValue={q} placeholder="Order no., name, email, phone" className={`${fieldCls} w-64`} aria-label="Search orders" />
        <select name="status" defaultValue={status} className={fieldCls} aria-label="Status">
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="payment" defaultValue={payment} className={fieldCls} aria-label="Payment status">
          <option value="">Any payment</option>
          {["PENDING", "PAID", "FAILED", "REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED"].map((p) => <option key={p} value={p}>{p.replace("_", " ").toLowerCase()}</option>)}
        </select>
      </FilterBar>
      <Table>
        <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Payment</th><th>Status</th><th className="text-right">Total</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td><Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-gold">{o.orderNumber}</Link></td>
              <td className="whitespace-nowrap text-xs">{o.placedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
              <td>{o.customerName}<p className="text-xs text-muted">{o.email}</p></td>
              <td>{o._count.items}</td>
              <td><Pill tone={o.paymentStatus === "PAID" ? "good" : o.paymentStatus === "FAILED" ? "bad" : "neutral"}>{o.paymentMethod === "COD" ? "COD · " : ""}{o.paymentStatus.toLowerCase().replace("_", " ")}</Pill></td>
              <td><Pill tone={statusTone(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Pill></td>
              <td className="text-right tabular-nums">{formatINR(o.total)}</td>
            </tr>
          ))}
          {!orders.length && <tr><td colSpan={7} className="py-10 text-center text-muted">No orders found.</td></tr>}
        </tbody>
      </Table>
      <AdminPagination page={page} pageCount={Math.ceil(total / PER)} base="/admin/orders" params={{ q, status, payment }} />
    </div>
  );
}
