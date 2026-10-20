import Link from "next/link";
import type { ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { FilterBar, PageHeader, Pill, Table, fieldCls, sp } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/forms";
import { moderateReviewAction } from "../ops-actions";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermissionPage("reviews.write", "/admin/reviews");
  const status = (sp((await searchParams).status) || "PENDING") as ReviewStatus;
  const reviews = await prisma.review.findMany({ where: { status }, orderBy: { createdAt: "desc" }, take: 100, include: { product: true } });
  return (
    <div>
      <PageHeader title="Reviews" description="Only approved reviews appear on product pages and count toward ratings." />
      <FilterBar action="/admin/reviews"><select name="status" defaultValue={status} className={fieldCls} aria-label="Status"><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></FilterBar>
      <Table>
        <thead><tr><th>Product</th><th>Rating</th><th>Review</th><th>Author</th><th className="text-right">Actions</th></tr></thead>
        <tbody>
          {reviews.map((r) => (
            <tr key={r.id}>
              <td><Link href={`/admin/products/${r.productId}`} className="hover:text-gold">{r.product.name}</Link></td>
              <td>{"★".repeat(r.rating)}</td>
              <td className="max-w-md"><p className="font-medium">{r.title}</p><p className="text-xs text-muted">{r.body}</p></td>
              <td className="text-xs">{r.authorName} {r.isVerifiedPurchase && <Pill tone="good">verified</Pill>} {r.isDemo && <Pill>demo</Pill>}</td>
              <td className="whitespace-nowrap text-right">
                {r.status !== "APPROVED" && <ActionButton action={moderateReviewAction.bind(null, r.id, "APPROVED")} label="Approve" variant="primary" />}{" "}
                {r.status !== "REJECTED" && <ActionButton action={moderateReviewAction.bind(null, r.id, "REJECTED")} label="Reject" />}
              </td>
            </tr>
          ))}
          {!reviews.length && <tr><td colSpan={5} className="py-10 text-center text-muted">Nothing to show.</td></tr>}
        </tbody>
      </Table>
    </div>
  );
}
