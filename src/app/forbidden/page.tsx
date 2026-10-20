import Link from "next/link";

export const metadata = { title: "Access denied", robots: { index: false } };

export default function Forbidden() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="eyebrow">403</p>
      <h1 className="text-4xl">You don&apos;t have access to this page</h1>
      <p className="max-w-md text-muted">Ask an administrator to grant your account the required permission.</p>
      <Link href="/" className="bg-ink px-6 py-3 text-xs uppercase tracking-[0.14em] text-ivory">Back to store</Link>
    </div>
  );
}
