import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermissionPage, hasPermission } from "@/lib/auth/session";
import { Card, PageHeader, Pill } from "@/components/admin/ui";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { ImageManager } from "@/components/admin/ImageManager";
import { ActionButton } from "@/components/admin/forms";
import { setProductStatusAction } from "../actions";
import { editorOptions, loadEditorProduct } from "../load";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermissionPage("products.read", `/admin/products/${id}`);
  const [product, opts] = await Promise.all([loadEditorProduct(id), editorOptions()]);
  if (!product) notFound();
  const canWrite = hasPermission(user, "products.write");
  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        back={{ href: "/admin/products", label: "Products" }}
        description={<span className="flex items-center gap-2">{product.sku} <Pill tone={product.statusLive === "ACTIVE" ? "good" : "warn"}>{product.statusLive.toLowerCase()}</Pill></span>}
        actions={
          <>
            <Link href={`/products/${product.slugLive}?preview=1`} target="_blank" className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-ink px-4 text-xs font-medium uppercase tracking-[0.12em]">Preview</Link>
            {canWrite && product.statusLive !== "ACTIVE" && <ActionButton action={setProductStatusAction.bind(null, id, "ACTIVE")} label="Publish" variant="primary" />}
            {canWrite && product.statusLive !== "ARCHIVED" && <ActionButton action={setProductStatusAction.bind(null, id, "ARCHIVED")} label="Archive" confirmText="Archive this product? It will be hidden from the store." />}
          </>
        }
      />
      <Card title="Images">{canWrite ? <ImageManager productId={id} images={product.images} /> : <p className="text-sm text-muted">{product.images.length} images</p>}</Card>
      {canWrite ? <ProductEditor product={product} {...opts} /> : <p className="text-sm text-muted">You have read-only access to products.</p>}
    </div>
  );
}
