import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { formatINR } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { Card, PageHeader, Pill, Table, statusTone } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/forms";
import { setUserActiveAction } from "../../ops-actions";

export const metadata = { title: "Customer" };

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermissionPage("customers.read", `/admin/customers/${id}`);
  const u = await prisma.user.findUnique({ where: { id }, include: { addresses: true, orders: { orderBy: { placedAt: "desc" }, take: 50 }, profile: true, role: true } });
  if (!u) notFound();
  const lifetime = u.orders.filter((o) => ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(o.status)).reduce((a, o) => a + o.total, 0);
  return (
    <div className="space-y-6">
      <PageHeader title={u.name} back={{ href: "/admin/customers", label: "Customers" }} description={`${u.email} · ${u.phone ?? "no phone"} · ${u.role.name}`}
        actions={<ActionButton action={setUserActiveAction.bind(null, u.id, !u.isActive)} label={u.isActive ? "Deactivate account" : "Reactivate account"} variant={u.isActive ? "danger" : "primary"} confirmText={u.isActive ? "Deactivate and sign out this customer?" : undefined} />} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Summary">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Joined</dt><dd>{u.createdAt.toLocaleDateString("en-IN")}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Last login</dt><dd>{u.lastLoginAt?.toLocaleDateString("en-IN") ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Orders</dt><dd>{u.orders.length}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Lifetime value</dt><dd>{formatINR(lifetime)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Email verified</dt><dd>{u.emailVerifiedAt ? "Yes" : "No"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Marketing</dt><dd>{u.profile?.marketingOptIn ? "Opted in" : "No"}</dd></div>
          </dl>
        </Card>
        <Card title="Addresses" className="lg:col-span-2">
          <ul className="grid gap-3 text-sm sm:grid-cols-2">
            {u.addresses.map((a) => <li key={a.id} className="rounded border border-line p-3">{a.fullName}<br /><span className="text-muted">{a.line1}, {a.city}, {a.state} {a.postalCode}</span></li>)}
            {!u.addresses.length && <li className="text-muted">No saved addresses.</li>}
          </ul>
        </Card>
      </div>
      <Card title="Orders">
        <Table>
          <thead><tr><th>Order</th><th>Date</th><th>Status</th><th className="text-right">Total</th></tr></thead>
          <tbody>{u.orders.map((o) => <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`} className="hover:text-gold">{o.orderNumber}</Link></td><td className="text-xs">{o.placedAt.toLocaleDateString("en-IN")}</td><td><Pill tone={statusTone(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Pill></td><td className="text-right">{formatINR(o.total)}</td></tr>)}</tbody>
        </Table>
      </Card>
    </div>
  );
}
