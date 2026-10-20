import type { Metadata } from "next";
import { verifyEmailToken } from "@/app/actions/auth";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Verify email", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = token ? await verifyEmailToken(token) : false;
  return (
    <div className="text-center">
      <h1 className="mb-4 text-4xl">{ok ? "Email verified" : "Link expired"}</h1>
      <p className="mb-8 text-muted">{ok ? "Thank you — your email address has been confirmed." : "This verification link is invalid or has expired. Sign in and request a new one from your account."}</p>
      <ButtonLink href="/account">Go to my account</ButtonLink>
    </div>
  );
}
