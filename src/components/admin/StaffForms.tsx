"use client";

import { assignRoleAction, saveRoleAction } from "@/app/admin/ops-actions";
import { AdminForm, AField, inputCls } from "./forms";

export function AssignRoleForm({ roles }: { roles: { key: string; name: string }[] }) {
  return (
    <AdminForm action={assignRoleAction} submitLabel="Assign role">
      <div className="grid gap-3 md:grid-cols-2">
        <AField label="Account email" hint="The person must have registered an account"><input name="email" type="email" className={inputCls} /></AField>
        <AField label="Role"><select name="role" className={inputCls}>{roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</select></AField>
      </div>
    </AdminForm>
  );
}

export function RoleForm({ role, permissions }: { role?: { key: string; name: string; perms: string[] }; permissions: [string, string][] }) {
  return (
    <AdminForm action={saveRoleAction} submitLabel={role ? "Save role" : "Create role"}>
      <div className="grid gap-3 md:grid-cols-2">
        <AField label="Key"><input name="key" defaultValue={role?.key} readOnly={!!role} className={inputCls} placeholder="e.g. merchandiser" /></AField>
        <AField label="Name"><input name="name" defaultValue={role?.name} className={inputCls} /></AField>
      </div>
      <div className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {permissions.map(([k, label]) => (
          <label key={k} className="flex items-center gap-2"><input type="checkbox" name="permissions" value={k} defaultChecked={role?.perms.includes(k)} /> {label}</label>
        ))}
      </div>
    </AdminForm>
  );
}
