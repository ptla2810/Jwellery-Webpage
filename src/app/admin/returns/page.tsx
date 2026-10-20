import Link from "next/link";
import type { ReturnStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { FilterBar, PageHeader, Pill, Table, fieldCls, sp } from "@/components/admin/ui";

export const metadata = { title: "Returns" };

export default async function ReturnsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermissionPage("orders.read", "/admin/returns");
  const status = sp((await searchParams).status);
  const rows = await prisma.returnRequest.findMany({ where: status ? { status: status as ReturnStatus } : {}, orderBy: { createdAt: "desc" }, take: 100, include: { order: true, orderItem: true } });
  return (
    <div>
      <PageHeader title="Returns & exchanges" description="Manage requests from the order page." />
      <FilterBar action="/admin/returns">
        <select name="status" defaultValue={status} className={fieldCls} aria-label="Status"><option value="">All</option>{["REQUESTED", "APPROVED", "REJECTED", "RECEIVED", "COMPLETED"].map((s) => <option key={s}>{s}</option>)}</select>
      </FilterBar>
      <Table>
        <thead><tr><th>Date</th><th>Order</th><th>Item</th><th>Type</th><th>Reason</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td className="text-xs">{r.createdAt.toLocaleDateString("en-IN")}</td><td><Link href={`/admin/orders/${r.orderId}`} className="hover:text-gold">{r.order.orderNumber}</Link></td><td>{r.orderItem.productName}</td><td>{r.type.toLowerCase()}</td><td>{r.reason}</td><td><Pill tone={r.status === "REQUESTED" ? "warn" : r.status === "REJECTED" ? "bad" : "good"}>{r.status.toLowerCase()}</Pill></td></tr>
          ))}
          {!rows.length && <tr><td colSpan={6} className="py-10 text-center text-muted">No requests.</td></tr>}
        </tbody>
      </Table>
    </div>
  );
}
