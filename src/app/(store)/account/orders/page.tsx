import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { formatINR } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { EmptyState, Badge } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await prisma.order.findMany({ where: { userId: user.id }, orderBy: { placedAt: "desc" }, include: { items: { take: 3 } }, take: 50 });
  if (!orders.length) return <EmptyState title="No orders yet" body="When you place an order it will appear here." action={<ButtonLink href="/shop">Start shopping</ButtonLink>} />;
  return (
    <div>
      <h2 className="mb-5 text-2xl">Orders</h2>
      <ul className="space-y-4">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/account/orders/${o.orderNumber}`} className="block border border-line bg-white p-5 transition-colors hover:border-gold">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{o.orderNumber}</p>
                <Badge tone={o.status === "DELIVERED" ? "success" : o.status === "CANCELLED" || o.status === "PAYMENT_FAILED" ? "danger" : "gold"}>{ORDER_STATUS_LABEL[o.status]}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">{o.placedAt.toLocaleDateString("en-IN", { dateStyle: "medium" })} · {formatINR(o.total)}</p>
              <p className="mt-2 truncate text-sm">{o.items.map((i) => i.productName).join(", ")}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
