import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { SupportForm } from "@/components/account/SupportForm";
import { Badge } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Support", robots: { index: false } };

export default async function SupportPage() {
  const user = await requireUser("/account/support");
  const requests = await prisma.supportRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 });
  return (
    <div className="space-y-10">
      {requests.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl">Your requests</h2>
          <ul className="space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="border border-line bg-white p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{r.subject}</p>
                  <Badge tone={r.status === "RESOLVED" || r.status === "CLOSED" ? "success" : "gold"}>{r.status.replace("_", " ").toLowerCase()}</Badge>
                </div>
                <p className="mt-1 text-muted">{r.createdAt.toLocaleDateString("en-IN", { dateStyle: "medium" })} · {r.type.replace("_", " ").toLowerCase()}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h2 className="mb-5 text-2xl">New request</h2>
        <SupportForm type="SUPPORT" defaults={{ name: user.name, email: user.email, phone: user.phone ?? "" }} />
      </section>
    </div>
  );
}
