import type { Metadata } from "next";
import Link from "next/link";
import { TrackForm } from "@/components/order/TrackForm";

export const metadata: Metadata = { title: "Track your order", description: "Check the status of your order." };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return (
    <div className="container-x flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="mb-3 text-center text-4xl">Track your order</h1>
        <p className="mb-8 text-center text-sm text-muted">Signed in? See all orders in <Link href="/account/orders" className="text-gold underline">My Account</Link>.</p>
        <TrackForm initialOrder={order} />
      </div>
    </div>
  );
}
