import type { Metadata } from "next";
import { getCartView } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/auth/tokens";
import { getSetting } from "@/lib/settings";
import { INDIAN_STATES } from "@/lib/orders/service";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [cart, user, store] = await Promise.all([getCartView(), getCurrentUser(), getSetting("store")]);
  if (!cart.lines.length) {
    return (
      <div className="container-x py-16">
        <EmptyState title="Your bag is empty" body="Add something you love before checking out." action={<ButtonLink href="/shop">Continue shopping</ButtonLink>} />
      </div>
    );
  }
  if (cart.hasIssues) {
    return (
      <div className="container-x py-16">
        <EmptyState title="Please review your bag" body="Some items are unavailable or exceed available stock." action={<ButtonLink href="/cart">Review bag</ButtonLink>} />
      </div>
    );
  }
  const addresses = user ? await prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] }) : [];
  return (
    <div className="container-x py-10">
      <h1 className="mb-8 text-4xl">Checkout</h1>
      <CheckoutFlow
        cart={cart}
        checkoutToken={randomToken(24)}
        storeName={store.name}
        user={user ? { name: user.name, email: user.email, phone: user.phone } : null}
        savedAddresses={addresses.map((a) => ({ id: a.id, isDefault: a.isDefault, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", landmark: a.landmark ?? "", city: a.city, state: a.state, postalCode: a.postalCode }))}
        states={INDIAN_STATES}
      />
    </div>
  );
}
