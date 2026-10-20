import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { PageHeader, Pill, Table } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/forms";
import { ButtonLink } from "@/components/ui/Button";
import { deleteCategoryAction, moveCategoryAction } from "../catalog-actions";

export const metadata = { title: "Categories" };
const KINDS = [["TYPE", "Jewellery types"], ["MATERIAL", "Metals & materials"], ["OCCASION", "Occasions"]] as const;

export default async function CategoriesPage() {
  await requirePermissionPage("catalog.write", "/admin/categories");
  const cats = await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { primaryFor: true, products: true } }, parent: true } });
  return (
    <div className="space-y-8">
      <PageHeader title="Categories" description="Drive the mega-menu, listing pages and filters." actions={<ButtonLink href="/admin/categories/new" size="sm">New category</ButtonLink>} />
      {KINDS.map(([kind, label]) => {
        const list = cats.filter((c) => c.kind === kind);
        const ordered = [...list.filter((c) => !c.parentId), ...list.filter((c) => c.parentId)];
        return (
          <section key={kind}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-muted">{label}</h2>
            <Table>
              <thead><tr><th>Name</th><th>Slug</th><th>Products</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {ordered.map((c) => (
                  <tr key={c.id}>
                    <td><Link href={`/admin/categories/${c.id}`} className="font-medium hover:text-gold">{c.parent ? `↳ ${c.name}` : c.name}</Link>{c.parent && <span className="ml-1 text-xs text-muted">in {c.parent.name}</span>}</td>
                    <td className="text-xs">{c.slug}</td>
                    <td>{c._count.primaryFor + c._count.products}</td>
                    <td>{c.isActive ? <Pill tone="good">active</Pill> : <Pill>inactive</Pill>} {!c.showInMenu && <Pill>hidden in menu</Pill>}</td>
                    <td className="whitespace-nowrap text-right">
                      <ActionButton action={moveCategoryAction.bind(null, c.id, -1)} label="↑" variant="ghost" />
                      <ActionButton action={moveCategoryAction.bind(null, c.id, 1)} label="↓" variant="ghost" />
                      <ActionButton action={deleteCategoryAction.bind(null, c.id)} label="Delete" variant="ghost" confirmText={`Delete ${c.name}?`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </section>
        );
      })}
    </div>
  );
}
