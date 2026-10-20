import type { Metadata } from "next";
import { getCartView } from "@/lib/cart";
import { CartPageClient } from "@/components/cart/CartPageClient";

export const metadata: Metadata = { title: "Your bag", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await getCartView();
  return (
    <div className="container-x py-10">
      <h1 className="mb-8 text-4xl">Your bag</h1>
      <CartPageClient initial={cart} />
    </div>
  );
}
