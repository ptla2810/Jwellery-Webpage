import type { Metadata } from "next";
import { requirePermissionPage } from "@/lib/auth/session";
import { getSetting } from "@/lib/settings";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermissionPage("admin.access", "/admin");
  const store = await getSetting("store");
  return (
    <div className="min-h-screen bg-[#f7f5f1] lg:flex">
      <AdminNav permissions={[...user.permissions]} storeName={store.name} userName={`${user.name} · ${user.roleName}`} />
      <main id="main" className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
