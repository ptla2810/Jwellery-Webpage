import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { logoutAction } from "@/app/actions/auth";
import { AccountNav } from "@/components/account/AccountNav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  return (
    <div className="container-x py-10">
      <p className="eyebrow">My account</p>
      <h1 className="mt-1 text-4xl">Hello, {user.name.split(" ")[0]}</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside>
          <AccountNav />
          <form action={logoutAction} className="mt-4 border-t border-line pt-4">
            <button className="text-sm text-muted hover:text-danger">Sign out</button>
          </form>
          {user.permissions.has("admin.access") && <Link href="/admin" className="mt-4 block text-sm font-semibold text-gold">Admin dashboard →</Link>}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
