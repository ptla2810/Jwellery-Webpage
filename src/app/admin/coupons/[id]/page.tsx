import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { Card, PageHeader } from "@/components/admin/ui";
import { CouponForm } from "@/components/admin/MarketingForms";

export const metadata = { title: "Coupon" };

export default async function CouponEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermissionPage("marketing.write", "/admin/coupons");
  const c = id === "new" ? undefined : await prisma.coupon.findUnique({ where: { id } });
  if (c === null) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title={c ? c.code : "New coupon"} back={{ href: "/admin/coupons", label: "Coupons" }} />
      <Card><CouponForm c={c ?? undefined} /></Card>
    </div>
  );
}
