import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { PageHeader, Pill, Table } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = { title: "Content pages" };

export default async function PagesAdmin() {
  await requirePermissionPage("content.write", "/admin/pages");
  const pages = await prisma.contentPage.findMany({ orderBy: { title: "asc" } });
  return (
    <div>
      <PageHeader title="Policy & content pages" actions={<ButtonLink href="/admin/pages/new" size="sm">New page</ButtonLink>} />
      <Table>
        <thead><tr><th>Title</th><th>URL</th><th>Updated</th><th>Status</th></tr></thead>
        <tbody>{pages.map((p) => <tr key={p.id}><td><Link href={`/admin/pages/${p.id}`} className="font-medium hover:text-gold">{p.title}</Link></td><td className="text-xs">/pages/{p.slug}</td><td className="text-xs">{p.updatedAt.toLocaleDateString("en-IN")}</td><td>{p.isPublished ? <Pill tone="good">published</Pill> : <Pill>draft</Pill>}</td></tr>)}</tbody>
      </Table>
    </div>
  );
}
