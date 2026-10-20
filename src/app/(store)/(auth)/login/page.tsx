import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/account");
  return (
    <>
      <p className="eyebrow text-center">Welcome back</p>
      <h1 className="mb-8 mt-2 text-center text-4xl">Sign in</h1>
      <LoginForm next={next} />
      <p className="mt-8 text-center text-sm text-muted">
        New here? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-gold underline-offset-4 hover:underline">Create an account</Link>
      </p>
    </>
  );
}
