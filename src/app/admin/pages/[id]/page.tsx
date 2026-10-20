import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { Card, PageHeader } from "@/components/admin/ui";
import { PageForm } from "@/components/admin/MarketingForms";

export const metadata = { title: "Edit page" };

export default async function PageEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermissionPage("content.write", "/admin/pages");
  const page = id === "new" ? undefined : await prisma.contentPage.findUnique({ where: { id } });
  if (page === null) notFound();
  return (
    <div className="max-w-4xl">
      <PageHeader title={page ? page.title : "New page"} back={{ href: "/admin/pages", label: "Pages" }} />
      <Card><PageForm page={page ?? undefined} /></Card>
    </div>
  );
}
