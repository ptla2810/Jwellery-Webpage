import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { Card, PageHeader, Pill } from "@/components/admin/ui";
import { PromotionForm } from "@/components/admin/MarketingForms";

export const metadata = { title: "Promotions" };

export default async function PromotionsPage() {
  await requirePermissionPage("marketing.write", "/admin/promotions");
  const [promos, coupons, banners] = await Promise.all([
    prisma.promotion.findMany({ orderBy: { createdAt: "desc" }, include: { coupon: true, banner: true } }),
    prisma.coupon.findMany({ select: { id: true, code: true } }),
    prisma.banner.findMany({ select: { id: true, title: true } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Promotional campaigns" description="Group a coupon and a banner into a scheduled campaign." />
      {promos.map((p) => (
        <Card key={p.id} title={p.name} actions={p.isActive ? <Pill tone="good">active</Pill> : <Pill>inactive</Pill>}>
          <p className="mb-3 text-xs text-muted">{p.coupon ? `Coupon ${p.coupon.code}` : "No coupon"} · {p.banner ? `Banner “${p.banner.title}”` : "No banner"}</p>
          <PromotionForm p={p} coupons={coupons} banners={banners} />
        </Card>
      ))}
      <Card title="New campaign"><PromotionForm coupons={coupons} banners={banners} /></Card>
    </div>
  );
}
