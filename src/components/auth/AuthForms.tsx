"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/engagement";
import { Checkbox, FormMessage, Input } from "@/components/ui/Field";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PASSWORD_RULES } from "@/lib/auth/password-rules";

type KeptState = FormState & { values?: Record<string, string> };

/** React resets a form after its action runs; keep what was typed (never passwords) so a failed submit doesn't wipe it. */
function keepValues(fn: (state: FormState, form: FormData) => Promise<FormState>) {
  return async (state: KeptState, form: FormData): Promise<KeptState> => {
    const values: Record<string, string> = {};
    for (const [k, v] of form) if (typeof v === "string" && k !== "password") values[k] = v;
    return { ...(await fn(state, form)), values };
  };
}
const login = keepValues(loginAction);
const register = keepValues(registerAction);

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<KeptState, FormData>(login, {});
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <Input name="email" type="email" label="Email" autoComplete="email" required defaultValue={v.email} />
      <Input name="password" type="password" label="Password" autoComplete="current-password" required />
      <div className="flex justify-end"><Link href="/forgot-password" className="text-xs text-gold underline-offset-4 hover:underline">Forgot password?</Link></div>
      <FormMessage error={state.error} />
      <Button type="submit" size="lg" className="w-full" loading={pending}>Sign in</Button>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<KeptState, FormData>(register, {});
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <Input name="name" label="Full name" autoComplete="name" required error={fe.name} defaultValue={v.name} />
      <Input name="email" type="email" label="Email" autoComplete="email" required error={fe.email} defaultValue={v.email} />
      <Input name="phone" type="tel" label="Mobile number (optional)" autoComplete="tel" inputMode="tel" error={fe.phone} defaultValue={v.phone} />
      <Input name="password" type="password" label="Password" autoComplete="new-password" required error={fe.password} hint={PASSWORD_RULES} />
      <Checkbox name="marketing" label="Send me news about new collections and offers" defaultChecked={v.marketing === "on"} />
      <FormMessage error={state.fieldErrors ? (Object.keys(fe).length ? null : state.error) : state.error} />
      <Button type="submit" size="lg" className="w-full" loading={pending}>Create account</Button>
      <p className="text-xs text-muted">By creating an account you agree to our <Link href="/pages/terms-of-service" className="underline">terms</Link> and <Link href="/pages/privacy-policy" className="underline">privacy policy</Link>.</p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPasswordAction, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <Input name="email" type="email" label="Email" autoComplete="email" required />
      <FormMessage error={state.error} success={state.message} />
      <Button type="submit" size="lg" className="w-full" loading={pending}>Send reset link</Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, {});
  if (state.ok) {
    return (
      <div className="space-y-5">
        <FormMessage success={state.message} />
        <ButtonLink href="/login" className="w-full">Sign in</ButtonLink>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <Input name="password" type="password" label="New password" autoComplete="new-password" required hint={PASSWORD_RULES} error={state.fieldErrors?.password} />
      <Input name="confirm" type="password" label="Confirm password" autoComplete="new-password" required error={state.fieldErrors?.confirm} />
      <FormMessage error={state.fieldErrors ? null : state.error} />
      <Button type="submit" size="lg" className="w-full" loading={pending}>Update password</Button>
    </form>
  );
}
