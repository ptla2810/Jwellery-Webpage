import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { expireStalePendingOrders } from "@/lib/orders/service";
import { ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { formatINR } from "@/lib/money";
import { daysAgo } from "@/lib/time";
import { Card, PageHeader, Pill, StatCard, Table } from "@/components/admin/ui";
import { RevenueChart } from "@/components/admin/RevenueChart";

export const metadata = { title: "Dashboard" };
const VALID = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export default async function Dashboard() {
  await requirePermissionPage("admin.access");
  await expireStalePendingOrders();
  const since = daysAgo(30);
  const valid = { status: { in: [...VALID] }, placedAt: { gte: since } };

  const [agg, refunds, pending, awaitingShipment, lowStock, daily, best, recentCustomers, recentOrders, openReturns, openSupport, pendingReviews] = await Promise.all([
    prisma.order.aggregate({ where: valid, _sum: { subtotal: true, discountTotal: true, total: true }, _count: true }),
    prisma.refund.aggregate({ where: { status: "COMPLETED", createdAt: { gte: since } }, _sum: { amount: true } }),
    prisma.order.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.order.count({ where: { status: { in: ["CONFIRMED", "PROCESSING"] } } }),
    prisma.$queryRaw<{ sku: string; name: string; quantity: number; productId: string; threshold: number }[]>`
      SELECT v.sku, p.name, i.quantity, p.id AS "productId", i."lowStockThreshold" AS threshold
      FROM "Inventory" i JOIN "ProductVariant" v ON v.id = i."variantId" JOIN "Product" p ON p.id = v."productId"
      WHERE i.quantity <= i."lowStockThreshold" AND v."isActive" AND p.status = 'ACTIVE'
      ORDER BY i.quantity ASC LIMIT 8`,
    prisma.$queryRaw<{ day: string; revenue: bigint; orders: bigint }[]>`
      SELECT to_char(("placedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day, SUM(total)::bigint AS revenue, COUNT(*)::bigint AS orders
      FROM "Order" WHERE status IN ('CONFIRMED','PROCESSING','SHIPPED','DELIVERED') AND "placedAt" >= ${since}
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ productId: string; name: string; qty: bigint; revenue: bigint }[]>`
      SELECT oi."productId", MAX(oi."productName") AS name, SUM(oi.quantity)::bigint AS qty, SUM(oi."lineTotal")::bigint AS revenue
      FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status IN ('CONFIRMED','PROCESSING','SHIPPED','DELIVERED') AND o."placedAt" >= ${since}
      GROUP BY oi."productId" ORDER BY qty DESC LIMIT 5`,
    prisma.user.findMany({ where: { role: { key: "customer" } }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, createdAt: true } }),
    prisma.order.findMany({ orderBy: { placedAt: "desc" }, take: 6 }),
    prisma.returnRequest.count({ where: { status: "REQUESTED" } }),
    prisma.supportRequest.count({ where: { status: "OPEN" } }),
    prisma.review.count({ where: { status: "PENDING" } }),
  ]);

  const gross = agg._sum.subtotal ?? 0;
  const net = gross - (agg._sum.discountTotal ?? 0) - (refunds._sum.amount ?? 0);
  const count = agg._count;
  const aov = count ? Math.round((agg._sum.total ?? 0) / count) : 0;
  // Business days are bucketed in India Standard Time on both the SQL and JS side.
  const istKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
  const days = Array.from({ length: 30 }, (_, i) => {
    const key = istKey.format(daysAgo(29 - i));
    const row = daily.find((r) => r.day === key);
    return { day: key, revenue: Number(row?.revenue ?? 0), orders: Number(row?.orders ?? 0) };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Last 30 days. Orders count once confirmed (paid online or placed with cash on delivery)." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Orders" value={count} hint="Confirmed, processing, shipped or delivered" href="/admin/orders" />
        <StatCard label="Gross sales" value={formatINR(gross)} hint="Merchandise value before discounts, incl. GST" />
        <StatCard label="Net sales" value={formatINR(net)} hint="Gross − discounts − completed refunds" />
        <StatCard label="Average order value" value={formatINR(aov)} hint="Order totals ÷ orders" />
        <StatCard label="Awaiting payment" value={pending} href="/admin/orders?status=PENDING_PAYMENT" />
        <StatCard label="Awaiting shipment" value={awaitingShipment} href="/admin/orders?status=CONFIRMED" />
        <StatCard label="Open returns" value={openReturns} href="/admin/returns" />
        <StatCard label="Open support · reviews to moderate" value={`${openSupport} · ${pendingReviews}`} href="/admin/support" />
      </div>
      <Card title="Daily revenue">
        <RevenueChart data={days} />
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Best-selling products" actions={<Link href="/admin/products" className="text-xs text-gold">All products</Link>}>
          {best.length ? (
            <ul className="divide-y divide-line text-sm">
              {best.map((b) => (
                <li key={b.productId} className="flex justify-between py-2"><Link href={`/admin/products/${b.productId}`} className="hover:text-gold">{b.name}</Link><span className="tabular-nums text-muted">{Number(b.qty)} sold · {formatINR(Number(b.revenue))}</span></li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No sales in this period yet.</p>}
        </Card>
        <Card title="Inventory alerts" actions={<Link href="/admin/inventory?low=1" className="text-xs text-gold">Manage stock</Link>}>
          {lowStock.length ? (
            <ul className="divide-y divide-line text-sm">
              {lowStock.map((l) => (
                <li key={l.sku} className="flex items-center justify-between py-2">
                  <span><Link href={`/admin/products/${l.productId}`} className="hover:text-gold">{l.name}</Link> <span className="text-xs text-muted">{l.sku}</span></span>
                  <Pill tone={l.quantity <= 0 ? "bad" : "warn"}>{l.quantity <= 0 ? "Out of stock" : `${l.quantity} left`}</Pill>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">All variants are above their low-stock threshold.</p>}
        </Card>
        <Card title="Recent orders" actions={<Link href="/admin/orders" className="text-xs text-gold">All orders</Link>}>
          <Table>
            <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-gold">{o.orderNumber}</Link></td><td>{o.customerName}</td><td><Pill>{ORDER_STATUS_LABEL[o.status]}</Pill></td><td className="text-right tabular-nums">{formatINR(o.total)}</td></tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card title="Recent customers" actions={<Link href="/admin/customers" className="text-xs text-gold">All customers</Link>}>
          <ul className="divide-y divide-line text-sm">
            {recentCustomers.map((c) => (
              <li key={c.id} className="flex justify-between py-2"><Link href={`/admin/customers/${c.id}`} className="hover:text-gold">{c.name} <span className="text-muted">{c.email}</span></Link><span className="text-xs text-muted">{c.createdAt.toLocaleDateString("en-IN")}</span></li>
            ))}
            {!recentCustomers.length && <li className="py-2 text-muted">No customers yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
