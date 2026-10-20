import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { Card, PageHeader, Table } from "@/components/admin/ui";
import { ActionButton, AdminForm, inputCls } from "@/components/admin/forms";
import { CollectionForm } from "@/components/admin/CategoryForm";
import { addToCollectionFormAction, collectionProductAction } from "../../catalog-actions";

export const metadata = { title: "Collection" };

export default async function CollectionEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermissionPage("catalog.write", "/admin/collections");
  const c = id === "new" ? null : await prisma.collection.findUnique({ where: { id }, include: { products: { include: { product: true }, orderBy: { sortOrder: "asc" } } } });
  if (id !== "new" && !c) notFound();
  return (
    <div className="space-y-6">
      <PageHeader title={c ? c.name : "New collection"} back={{ href: "/admin/collections", label: "Collections" }} actions={c && <Link href={`/collections/${c.slug}`} target="_blank" className="text-sm text-gold">View on store →</Link>} />
      <Card>
        <CollectionForm collection={{ id: c?.id, name: c?.name ?? "", slug: c?.slug ?? "", description: c?.description ?? "", rule: c?.rule ?? "MANUAL", sortOrder: c?.sortOrder ?? 0, isPublished: c?.isPublished ?? false, showInMenu: c?.showInMenu ?? true, seoTitle: c?.seoTitle ?? "", seoDescription: c?.seoDescription ?? "", imageUrl: c?.imageUrl ?? "", bannerUrl: c?.bannerUrl ?? "" }} />
      </Card>
      {c && c.rule === "MANUAL" && (
        <Card title={`Products (${c.products.length})`}>
          <AdminForm action={addToCollectionFormAction} submitLabel="Add product" className="mb-4 flex items-end gap-2 space-y-0">
            <input type="hidden" name="collectionId" value={c.id} />
            <input name="sku" placeholder="Product SKU, e.g. AUR-RG-001" className={`${inputCls} max-w-xs`} aria-label="Product SKU" />
          </AdminForm>
          <Table>
            <thead><tr><th>Product</th><th>SKU</th><th>Status</th><th /></tr></thead>
            <tbody>
              {c.products.map(({ product: p }) => (
                <tr key={p.id}><td><Link href={`/admin/products/${p.id}`} className="hover:text-gold">{p.name}</Link></td><td className="text-xs">{p.sku}</td><td className="text-xs">{p.status.toLowerCase()}</td><td className="text-right"><ActionButton action={collectionProductAction.bind(null, c.id, p.id, "remove")} label="Remove" variant="ghost" /></td></tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
