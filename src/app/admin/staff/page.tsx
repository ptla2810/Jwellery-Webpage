import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Card, PageHeader, Pill, Table } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/forms";
import { AssignRoleForm, RoleForm } from "@/components/admin/StaffForms";
import { setUserActiveAction } from "../ops-actions";

export const metadata = { title: "Staff & roles" };

export default async function StaffPage() {
  await requirePermissionPage("staff.write", "/admin/staff");
  const [staff, roles] = await Promise.all([
    prisma.user.findMany({ where: { role: { key: { not: "customer" } } }, include: { role: true }, orderBy: { name: "asc" } }),
    prisma.role.findMany({ include: { permissions: { include: { permission: true } } }, orderBy: { name: "asc" } }),
  ]);
  const permList = Object.entries(PERMISSIONS) as [string, string][];
  return (
    <div className="space-y-6">
      <PageHeader title="Staff & roles" description="Access is enforced on the server for every admin page and action. Role changes sign the user out." />
      <Card title="Team members">
        <Table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last login</th><th>Status</th><th /></tr></thead>
          <tbody>
            {staff.map((u) => (
              <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role.name}</td><td className="text-xs">{u.lastLoginAt?.toLocaleString("en-IN") ?? "—"}</td><td>{u.isActive ? <Pill tone="good">active</Pill> : <Pill tone="bad">disabled</Pill>}</td>
                <td className="text-right"><ActionButton action={setUserActiveAction.bind(null, u.id, !u.isActive)} label={u.isActive ? "Disable" : "Enable"} variant="ghost" confirmText={u.isActive ? `Disable ${u.email}?` : undefined} /></td></tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Card title="Grant or change a role"><AssignRoleForm roles={roles.map((r) => ({ key: r.key, name: r.name }))} /></Card>
      {roles.filter((r) => r.key !== "customer").map((r) => (
        <Card key={r.id} title={`Role: ${r.name}`} actions={r.isSystem && <Pill>system</Pill>}>
          {r.key === "admin" ? (
            <p className="text-sm text-muted">Administrators always have every permission.</p>
          ) : (
            <RoleForm role={{ key: r.key, name: r.name, perms: r.permissions.map((p) => p.permission.key) }} permissions={permList} />
          )}
        </Card>
      ))}
      <Card title="Create a custom role"><RoleForm permissions={permList} /></Card>
    </div>
  );
}
