import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { PageHeader, Pill, Table } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = { title: "Collections" };

export default async function CollectionsAdmin() {
  await requirePermissionPage("catalog.write", "/admin/collections");
  const cols = await prisma.collection.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return (
    <div>
      <PageHeader title="Collections" actions={<ButtonLink href="/admin/collections/new" size="sm">New collection</ButtonLink>} />
      <Table>
        <thead><tr><th>Name</th><th>Slug</th><th>Products</th><th>Rule</th><th>Status</th></tr></thead>
        <tbody>
          {cols.map((c) => (
            <tr key={c.id}>
              <td><Link href={`/admin/collections/${c.id}`} className="font-medium hover:text-gold">{c.name}</Link></td>
              <td className="text-xs">{c.slug}</td>
              <td>{c.rule === "MANUAL" ? c._count.products : "automatic"}</td>
              <td className="text-xs">{c.rule.toLowerCase().replace("_", " ")}</td>
              <td>{c.isPublished ? <Pill tone="good">published</Pill> : <Pill>unpublished</Pill>}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
