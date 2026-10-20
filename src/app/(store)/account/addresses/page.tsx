import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { INDIAN_STATES } from "@/lib/orders/service";
import { AddressBook } from "@/components/account/AccountForms";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  return (
    <div>
      <h2 className="mb-5 text-2xl">Saved addresses</h2>
      <AddressBook states={INDIAN_STATES} addresses={addresses.map((a) => ({ id: a.id, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", landmark: a.landmark ?? "", city: a.city, state: a.state, postalCode: a.postalCode, isDefault: a.isDefault }))} />
    </div>
  );
}
