import type { Metadata } from "next";
import { ResetForm } from "@/components/auth/AuthForms";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="mb-8 text-center text-4xl">Choose a new password</h1>
      {token ? <ResetForm token={token} /> : <div className="text-center"><p className="mb-6 text-muted">This link is missing its token.</p><ButtonLink href="/forgot-password">Request a new link</ButtonLink></div>}
    </>
  );
}
