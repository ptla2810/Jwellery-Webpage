import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermissionPage, hasPermission } from "@/lib/auth/session";
import { AdminPagination, Card, FilterBar, PageHeader, Pill, Table, fieldCls, sp } from "@/components/admin/ui";
import { AdminForm, inputCls } from "@/components/admin/forms";
import { adjustStockAction } from "../catalog-actions";

export const metadata = { title: "Inventory" };
const PER = 30;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermissionPage("products.read", "/admin/inventory");
  const s = await searchParams;
  const q = sp(s.q).trim();
  const low = sp(s.low) === "1";
  const page = Math.max(1, Number(sp(s.page)) || 1);
  const canWrite = hasPermission(user, "inventory.write");
  let lowIds: string[] | null = null;
  if (low) {
    const rows = await prisma.$queryRaw<{ variantId: string }[]>`SELECT "variantId" FROM "Inventory" WHERE quantity <= "lowStockThreshold"`;
    lowIds = rows.map((r) => r.variantId);
  }
  const where: Prisma.ProductVariantWhereInput = {
    isActive: true,
    ...(q ? { OR: [{ sku: { contains: q, mode: "insensitive" } }, { product: { name: { contains: q, mode: "insensitive" } } }] } : {}),
    ...(lowIds ? { id: { in: lowIds } } : {}),
  };
  const [total, variants, movements] = await Promise.all([
    prisma.productVariant.count({ where }),
    prisma.productVariant.findMany({ where, include: { inventory: true, product: true }, orderBy: [{ inventory: { quantity: "asc" } }, { sku: "asc" }], skip: (page - 1) * PER, take: PER }),
    prisma.inventoryMovement.findMany({ orderBy: { createdAt: "desc" }, take: 15, include: { variant: true } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Stock on hand per variant. Orders reserve stock immediately; cancellations and expired payments return it." />
      <FilterBar action="/admin/inventory">
        <input name="q" defaultValue={q} placeholder="SKU or product" className={`${fieldCls} w-56`} aria-label="Search" />
        <label className="flex h-9 items-center gap-2 text-sm"><input type="checkbox" name="low" value="1" defaultChecked={low} /> Low stock only</label>
      </FilterBar>
      <Table>
        <thead><tr><th>Variant</th><th>SKU</th><th className="text-right">On hand</th><th>Threshold</th>{canWrite && <th>Adjust</th>}</tr></thead>
        <tbody>
          {variants.map((v) => {
            const qty = v.inventory?.quantity ?? 0;
            const th = v.inventory?.lowStockThreshold ?? 3;
            return (
              <tr key={v.id}>
                <td><Link href={`/admin/products/${v.productId}`} className="hover:text-gold">{v.product.name}</Link><p className="text-xs text-muted">{v.name}</p></td>
                <td className="text-xs">{v.sku}</td>
                <td className="text-right tabular-nums">{qty <= 0 ? <Pill tone="bad">0</Pill> : qty <= th ? <Pill tone="warn">{qty}</Pill> : qty}</td>
                <td className="tabular-nums">{th}</td>
                {canWrite && (
                  <td>
                    <AdminForm action={adjustStockAction} submitLabel="Apply" className="flex flex-wrap items-center gap-1 space-y-0 [&>button]:h-8">
                      <input type="hidden" name="variantId" value={v.id} />
                      <select name="mode" className={`${inputCls} w-24 py-1`} aria-label="Mode"><option value="delta">Add/remove</option><option value="set">Set to</option></select>
                      <input name="amount" type="number" className={`${inputCls} w-20 py-1`} aria-label="Amount" defaultValue={0} />
                      <select name="reason" className={`${inputCls} w-28 py-1`} aria-label="Reason"><option value="RESTOCK">Restock</option><option value="ADJUSTMENT">Adjustment</option></select>
                      <input name="threshold" type="number" min={0} defaultValue={th} className={`${inputCls} w-16 py-1`} aria-label="Low-stock threshold" title="Low-stock threshold" />
                    </AdminForm>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </Table>
      <AdminPagination page={page} pageCount={Math.ceil(total / PER)} base="/admin/inventory" params={{ q, low: low ? "1" : undefined }} />
      <Card title="Recent stock movements">
        <ul className="divide-y divide-line text-sm">
          {movements.map((m) => (
            <li key={m.id} className="flex justify-between py-2"><span>{m.variant.sku} · {m.reason.toLowerCase().replace("_", " ")} {m.reference && <span className="text-muted">({m.reference})</span>}</span><span className={m.delta < 0 ? "text-danger" : "text-success"}>{m.delta > 0 ? "+" : ""}{m.delta}</span></li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
