import type { SupportStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { FilterBar, PageHeader, Pill, Table, fieldCls, sp } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/forms";
import { updateSupportAction } from "../ops-actions";

export const metadata = { title: "Support" };

export default async function SupportAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermissionPage("support.write", "/admin/support");
  const s = await searchParams;
  const status = sp(s.status);
  const type = sp(s.type);
  const rows = await prisma.supportRequest.findMany({ where: { ...(status ? { status: status as SupportStatus } : { status: { in: ["OPEN", "IN_PROGRESS"] } }), ...(type ? { type: type as "SUPPORT" } : {}) }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div>
      <PageHeader title="Support & consultations" description="Reply by email or phone, then update the status." />
      <FilterBar action="/admin/support">
        <select name="status" defaultValue={status} className={fieldCls} aria-label="Status"><option value="">Open & in progress</option>{["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((x) => <option key={x}>{x}</option>)}</select>
        <select name="type" defaultValue={type} className={fieldCls} aria-label="Type"><option value="">All types</option><option value="SUPPORT">Support</option><option value="CONSULTATION">Consultation</option><option value="ORDER_ISSUE">Order issue</option></select>
      </FilterBar>
      <Table>
        <thead><tr><th>Received</th><th>Type</th><th>From</th><th>Request</th><th>Status</th><th className="text-right">Update</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap text-xs">{r.createdAt.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
              <td><Pill tone={r.type === "CONSULTATION" ? "info" : "neutral"}>{r.type.toLowerCase().replace("_", " ")}</Pill></td>
              <td className="text-sm">{r.name}<p className="text-xs text-muted"><a href={`mailto:${r.email}`} className="underline">{r.email}</a>{r.phone && ` · ${r.phone}`}</p></td>
              <td className="max-w-md"><p className="font-medium">{r.subject}</p><p className="text-xs text-muted">{r.message}</p>{(r.orderNumber || r.preferredDate) && <p className="text-xs">{r.orderNumber && `Order ${r.orderNumber}`} {r.preferredDate && `Preferred ${r.preferredDate.toLocaleDateString("en-IN")} · ${r.preferredMode ?? ""}`}</p>}</td>
              <td><Pill tone={r.status === "OPEN" ? "warn" : r.status === "RESOLVED" || r.status === "CLOSED" ? "good" : "info"}>{r.status.toLowerCase().replace("_", " ")}</Pill></td>
              <td className="whitespace-nowrap text-right">
                {r.status === "OPEN" && <ActionButton action={updateSupportAction.bind(null, r.id, "IN_PROGRESS")} label="In progress" />}{" "}
                {r.status !== "RESOLVED" && <ActionButton action={updateSupportAction.bind(null, r.id, "RESOLVED")} label="Resolve" variant="primary" />}
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={6} className="py-10 text-center text-muted">No requests.</td></tr>}
        </tbody>
      </Table>
    </div>
  );
}
