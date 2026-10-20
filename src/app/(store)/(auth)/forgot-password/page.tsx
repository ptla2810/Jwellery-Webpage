import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <>
      <h1 className="mb-3 text-center text-4xl">Forgot password</h1>
      <p className="mb-8 text-center text-sm text-muted">Enter your email and we&apos;ll send you a link to reset your password.</p>
      <ForgotForm />
    </>
  );
}
