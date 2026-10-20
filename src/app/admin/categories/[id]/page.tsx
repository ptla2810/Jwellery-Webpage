import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/ui";
import { CategoryForm } from "@/components/admin/CategoryForm";

export const metadata = { title: "Category" };

export default async function CategoryEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermissionPage("catalog.write", "/admin/categories");
  const parents = await prisma.category.findMany({ where: { parentId: null }, orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } });
  const c = id === "new" ? null : await prisma.category.findUnique({ where: { id } });
  if (id !== "new" && !c) notFound();
  return (
    <div>
      <PageHeader title={c ? c.name : "New category"} back={{ href: "/admin/categories", label: "Categories" }} />
      <div className="max-w-3xl rounded-[var(--radius-md)] border border-line bg-white p-5">
        <CategoryForm
          parents={parents}
          category={{ id: c?.id, name: c?.name ?? "", slug: c?.slug ?? "", kind: c?.kind ?? "TYPE", parentId: c?.parentId ?? "", description: c?.description ?? "", sortOrder: c?.sortOrder ?? 0, isActive: c?.isActive ?? true, showInMenu: c?.showInMenu ?? true, seoTitle: c?.seoTitle ?? "", seoDescription: c?.seoDescription ?? "", imageUrl: c?.imageUrl ?? "", bannerUrl: c?.bannerUrl ?? "" }}
        />
      </div>
    </div>
  );
}
