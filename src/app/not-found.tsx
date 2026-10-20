import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="eyebrow">404</p>
      <h1 className="text-5xl">This page has slipped away</h1>
      <p className="max-w-md text-muted">The page you were looking for doesn&apos;t exist or is no longer available.</p>
      <div className="mt-4 flex gap-3">
        <Link href="/" className="bg-ink px-6 py-3 text-xs uppercase tracking-[0.14em] text-ivory">Go home</Link>
        <Link href="/shop" className="border border-ink px-6 py-3 text-xs uppercase tracking-[0.14em]">Shop jewellery</Link>
      </div>
    </div>
  );
}
