import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { PageHeader, Pill, Table } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/forms";
import { ButtonLink } from "@/components/ui/Button";
import { deleteBannerAction } from "../ops-actions";

export const metadata = { title: "Banners" };

export default async function BannersPage() {
  await requirePermissionPage("marketing.write", "/admin/banners");
  const banners = await prisma.banner.findMany({ orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] });
  return (
    <div>
      <PageHeader title="Homepage banners" description="Hero slides and editorial tiles on the homepage." actions={<ButtonLink href="/admin/banners/new" size="sm">New banner</ButtonLink>} />
      <Table>
        <thead><tr><th>Image</th><th>Title</th><th>Placement</th><th>Link</th><th>Status</th><th /></tr></thead>
        <tbody>
          {banners.map((b) => (
            <tr key={b.id}>
              <td><span className="relative block h-12 w-20 overflow-hidden bg-cream"><Image src={b.imageUrl} alt="" fill sizes="80px" className="object-cover" unoptimized={b.imageUrl.endsWith(".svg")} /></span></td>
              <td><Link href={`/admin/banners/${b.id}`} className="font-medium hover:text-gold">{b.title}</Link></td>
              <td className="text-xs">{b.placement.toLowerCase()} · #{b.sortOrder}</td>
              <td className="text-xs">{b.ctaHref}</td>
              <td>{b.isActive ? <Pill tone="good">active</Pill> : <Pill>inactive</Pill>}</td>
              <td className="text-right"><ActionButton action={deleteBannerAction.bind(null, b.id)} label="Delete" variant="ghost" confirmText="Delete this banner?" /></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
