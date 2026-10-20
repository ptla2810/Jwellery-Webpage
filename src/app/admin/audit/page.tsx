import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { AdminPagination, FilterBar, PageHeader, Table, fieldCls, sp } from "@/components/admin/ui";

export const metadata = { title: "Audit log" };
const PER = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermissionPage("audit.read", "/admin/audit");
  const s = await searchParams;
  const action = sp(s.action);
  const page = Math.max(1, Number(sp(s.page)) || 1);
  const where = action ? { action: { startsWith: action } } : {};
  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { actor: { select: { name: true, email: true } } } }),
  ]);
  return (
    <div>
      <PageHeader title="Audit log" description="Sensitive administrative actions. Passwords and payment secrets are never recorded." />
      <FilterBar action="/admin/audit"><input name="action" defaultValue={action} placeholder="Action prefix, e.g. order." className={`${fieldCls} w-56`} aria-label="Filter by action" /></FilterBar>
      <Table>
        <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="whitespace-nowrap text-xs">{l.createdAt.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "medium" })}</td>
              <td className="text-xs">{l.actor?.name ?? "system"}<p className="text-muted">{l.ip}</p></td>
              <td className="font-mono text-xs">{l.action}</td>
              <td className="text-xs">{l.entityType} {l.entityId && <span className="text-muted">{l.entityId.slice(0, 10)}…</span>}</td>
              <td className="max-w-sm truncate font-mono text-xs text-muted">{l.metadata ? JSON.stringify(l.metadata) : ""}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <AdminPagination page={page} pageCount={Math.ceil(total / PER)} base="/admin/audit" params={{ action }} />
    </div>
  );
}
