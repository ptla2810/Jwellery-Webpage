import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermissionPage, hasPermission } from "@/lib/auth/session";
import { formatINR } from "@/lib/money";
import { metalSummary } from "@/lib/catalog/labels";
import { AdminPagination, FilterBar, PageHeader, Pill, Table, fieldCls, sp } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = { title: "Products" };
const PER = 25;
const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  updated: { updatedAt: "desc" }, name: { name: "asc" }, price_asc: { minPrice: "asc" }, price_desc: { minPrice: "desc" }, sales: { salesCount: "desc" },
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermissionPage("products.read", "/admin/products");
  const s = await searchParams;
  const q = sp(s.q).trim();
  const status = sp(s.status);
  const category = sp(s.category);
  const stock = sp(s.stock);
  const sort = SORTS[sp(s.sort)] ? sp(s.sort) : "updated";
  const page = Math.max(1, Number(sp(s.page)) || 1);
  const where: Prisma.ProductWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }, { variants: { some: { sku: { contains: q, mode: "insensitive" } } } }] } : {}),
    ...(status ? { status: status as "ACTIVE" } : {}),
    ...(category ? { primaryCategoryId: category } : {}),
    ...(stock === "out" ? { inStock: false } : stock === "in" ? { inStock: true } : {}),
  };
  const [total, products, categories] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy: [SORTS[sort], { id: "asc" }], skip: (page - 1) * PER, take: PER, include: { primaryCategory: true, variants: { where: { isActive: true }, include: { inventory: true } } } }),
    prisma.category.findMany({ where: { kind: "TYPE" }, orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div>
      <PageHeader title="Products" description={`${total} products`} actions={hasPermission(user, "products.write") && <ButtonLink href="/admin/products/new" size="sm">New product</ButtonLink>} />
      <FilterBar action="/admin/products">
        <input name="q" defaultValue={q} placeholder="Search name or SKU" className={`${fieldCls} w-56`} aria-label="Search" />
        <select name="status" defaultValue={status} className={fieldCls} aria-label="Status"><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select>
        <select name="category" defaultValue={category} className={fieldCls} aria-label="Category"><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="stock" defaultValue={stock} className={fieldCls} aria-label="Stock"><option value="">Any stock</option><option value="in">In stock</option><option value="out">Out of stock</option></select>
        <select name="sort" defaultValue={sort} className={fieldCls} aria-label="Sort"><option value="updated">Recently updated</option><option value="name">Name</option><option value="price_asc">Price ↑</option><option value="price_desc">Price ↓</option><option value="sales">Best selling</option></select>
      </FilterBar>
      <Table>
        <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Status</th><th className="text-right">Price from</th><th className="text-right">Stock</th></tr></thead>
        <tbody>
          {products.map((p) => {
            const stockQty = p.variants.reduce((a, v) => a + (v.inventory?.quantity ?? 0), 0);
            return (
              <tr key={p.id}>
                <td><Link href={`/admin/products/${p.id}`} className="font-medium hover:text-gold">{p.name}</Link><p className="text-xs text-muted">{metalSummary(p.metalType, p.purity)}</p></td>
                <td className="text-xs">{p.sku}</td>
                <td>{p.primaryCategory.name}</td>
                <td><Pill tone={p.status === "ACTIVE" ? "good" : p.status === "DRAFT" ? "warn" : "neutral"}>{p.status.toLowerCase()}</Pill></td>
                <td className="text-right tabular-nums">{formatINR(p.minPrice)}</td>
                <td className="text-right tabular-nums">{stockQty === 0 ? <Pill tone="bad">0</Pill> : stockQty}</td>
              </tr>
            );
          })}
          {!products.length && <tr><td colSpan={6} className="py-10 text-center text-muted">No products match these filters.</td></tr>}
        </tbody>
      </Table>
      <AdminPagination page={page} pageCount={Math.ceil(total / PER)} base="/admin/products" params={{ q, status, category, stock, sort }} />
    </div>
  );
}
