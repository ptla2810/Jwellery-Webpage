import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PasswordForm, ProfileForm, ResendVerification } from "@/components/account/AccountForms";
import { FormMessage } from "@/components/ui/Field";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

const d = (v?: Date | null) => (v ? v.toISOString().slice(0, 10) : "");

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser("/account");
  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { profile: true } });
  return (
    <div className="space-y-12">
      {(await searchParams).welcome && <FormMessage success="Welcome! Your account has been created." />}
      {!user.emailVerified && (
        <div className="border border-gold-300 bg-gold-100/50 p-4 text-sm">
          <p>Please verify your email address — we&apos;ve sent you a link.</p>
          <ResendVerification />
        </div>
      )}
      <section>
        <h2 className="mb-5 text-2xl">Profile</h2>
        <ProfileForm profile={{ name: record.name, email: record.email, phone: record.phone ?? "", dateOfBirth: d(record.profile?.dateOfBirth), anniversary: d(record.profile?.anniversary), marketingOptIn: !!record.profile?.marketingOptIn }} />
      </section>
      <section>
        <h2 className="mb-5 text-2xl">Password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
