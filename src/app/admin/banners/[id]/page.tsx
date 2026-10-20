import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { Card, PageHeader } from "@/components/admin/ui";
import { BannerForm } from "@/components/admin/MarketingForms";

export const metadata = { title: "Banner" };

export default async function BannerEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermissionPage("marketing.write", "/admin/banners");
  const b = id === "new" ? undefined : await prisma.banner.findUnique({ where: { id } });
  if (b === null) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title={b ? b.title : "New banner"} back={{ href: "/admin/banners", label: "Banners" }} />
      <Card><BannerForm b={b ?? undefined} /></Card>
    </div>
  );
}
