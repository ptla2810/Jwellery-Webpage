import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermissionPage } from "@/lib/auth/session";
import { AdminPagination, FilterBar, PageHeader, Pill, Table, fieldCls, sp } from "@/components/admin/ui";

export const metadata = { title: "Customers" };
const PER = 30;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermissionPage("customers.read", "/admin/customers");
  const s = await searchParams;
  const q = sp(s.q).trim();
  const page = Math.max(1, Number(sp(s.page)) || 1);
  const where: Prisma.UserWhereInput = { role: { key: "customer" }, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}) };
  const [total, users, subs] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { orders: true } } } }),
    prisma.newsletterSubscription.count({ where: { status: "SUBSCRIBED" } }),
  ]);
  return (
    <div>
      <PageHeader title="Customers" description={`${total} registered customers · ${subs} newsletter subscribers`} />
      <FilterBar action="/admin/customers"><input name="q" defaultValue={q} placeholder="Name, email or phone" className={`${fieldCls} w-64`} aria-label="Search customers" /></FilterBar>
      <Table>
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Joined</th><th>Status</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td><Link href={`/admin/customers/${u.id}`} className="font-medium hover:text-gold">{u.name}</Link></td>
              <td>{u.email} {u.emailVerifiedAt && <Pill tone="good">verified</Pill>}</td>
              <td>{u.phone ?? "—"}</td>
              <td>{u._count.orders}</td>
              <td className="text-xs">{u.createdAt.toLocaleDateString("en-IN")}</td>
              <td>{u.isActive ? <Pill tone="good">active</Pill> : <Pill tone="bad">deactivated</Pill>}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <AdminPagination page={page} pageCount={Math.ceil(total / PER)} base="/admin/customers" params={{ q }} />
    </div>
  );
}
