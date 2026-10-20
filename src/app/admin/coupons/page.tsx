import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { formatINR } from "@/lib/money";
import { PageHeader, Pill, Table } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/forms";
import { ButtonLink } from "@/components/ui/Button";
import { toggleCouponAction } from "../ops-actions";

export const metadata = { title: "Coupons" };

export default async function CouponsPage() {
  await requirePermissionPage("marketing.write", "/admin/coupons");
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const now = new Date();
  return (
    <div>
      <PageHeader title="Coupons" description="Discounts are validated and applied on the server at checkout." actions={<ButtonLink href="/admin/coupons/new" size="sm">New coupon</ButtonLink>} />
      <Table>
        <thead><tr><th>Code</th><th>Discount</th><th>Minimum</th><th>Used</th><th>Valid</th><th>Status</th><th /></tr></thead>
        <tbody>
          {coupons.map((c) => {
            const expired = c.endsAt && c.endsAt < now;
            return (
              <tr key={c.id}>
                <td><Link href={`/admin/coupons/${c.id}`} className="font-mono font-medium hover:text-gold">{c.code}</Link><p className="text-xs text-muted">{c.description}</p></td>
                <td>{c.type === "PERCENT" ? `${c.value}%${c.maxDiscount ? ` (max ${formatINR(c.maxDiscount)})` : ""}` : formatINR(c.value)}</td>
                <td>{formatINR(c.minSubtotal)}</td>
                <td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}{c.perUserLimit ? <span className="text-xs text-muted"> · {c.perUserLimit}/customer</span> : null}</td>
                <td className="text-xs">{c.startsAt?.toLocaleDateString("en-IN") ?? "—"} → {c.endsAt?.toLocaleDateString("en-IN") ?? "no end"}</td>
                <td>{expired ? <Pill>expired</Pill> : c.isActive ? <Pill tone="good">active</Pill> : <Pill tone="bad">disabled</Pill>}</td>
                <td className="text-right"><ActionButton action={toggleCouponAction.bind(null, c.id, !c.isActive)} label={c.isActive ? "Disable" : "Enable"} variant="ghost" /></td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
