import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { RegisterForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/account");
  return (
    <>
      <p className="eyebrow text-center">Join us</p>
      <h1 className="mb-8 mt-2 text-center text-4xl">Create an account</h1>
      <RegisterForm next={next} />
      <p className="mt-8 text-center text-sm text-muted">
        Already registered? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-gold underline-offset-4 hover:underline">Sign in</Link>
      </p>
    </>
  );
}
