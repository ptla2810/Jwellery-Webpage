"use client";

import { useActionState, useState, useTransition } from "react";
import { changePasswordAction, deleteAddressAction, saveAddressAction, updateProfileAction } from "@/app/actions/account";
import { resendVerificationAction } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/engagement";
import { Checkbox, FormMessage, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type Profile = { name: string; email: string; phone: string; dateOfBirth: string; anniversary: string; marketingOptIn: boolean };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfileAction, {});
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2" noValidate>
      <Input name="name" label="Full name" defaultValue={profile.name} error={state.fieldErrors?.name} required />
      <Input name="email" label="Email" defaultValue={profile.email} disabled hint="Contact support to change your email" />
      <Input name="phone" label="Mobile" defaultValue={profile.phone} error={state.fieldErrors?.phone} />
      <div />
      <Input name="dateOfBirth" type="date" label="Birthday (optional)" defaultValue={profile.dateOfBirth} />
      <Input name="anniversary" type="date" label="Anniversary (optional)" defaultValue={profile.anniversary} />
      <Checkbox name="marketingOptIn" defaultChecked={profile.marketingOptIn} label="Email me about new collections and offers" className="sm:col-span-2" />
      <div className="space-y-3 sm:col-span-2">
        <FormMessage error={state.fieldErrors ? null : state.error} success={state.message} />
        <Button loading={pending}>Save profile</Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2" noValidate>
      <Input name="current" type="password" label="Current password" autoComplete="current-password" error={state.fieldErrors?.current} />
      <Input name="password" type="password" label="New password" autoComplete="new-password" error={state.fieldErrors?.password} />
      <div className="space-y-3 sm:col-span-2">
        <FormMessage error={state.fieldErrors ? null : state.error} success={state.message} />
        <Button variant="outline" loading={pending}>Change password</Button>
      </div>
    </form>
  );
}

export function ResendVerification() {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>({});
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="link" disabled={pending} onClick={() => start(async () => setState(await resendVerificationAction()))}>Resend verification email</Button>
      <FormMessage error={state.error} success={state.message} />
    </div>
  );
}

type Addr = { id?: string; fullName: string; phone: string; line1: string; line2: string; landmark: string; city: string; state: string; postalCode: string; isDefault: boolean };

export function AddressForm({ address, states, onDone }: { address?: Addr; states: readonly string[]; onDone?: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (s: FormState, f: FormData) => {
    const r = await saveAddressAction(s, f);
    if (r.ok) onDone?.();
    return r;
  }, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4 border border-line bg-white p-5 sm:grid-cols-2" noValidate>
      {address?.id && <input type="hidden" name="id" value={address.id} />}
      <Input name="fullName" label="Recipient name" defaultValue={address?.fullName} error={fe.fullName} required />
      <Input name="phone" label="Mobile" defaultValue={address?.phone} error={fe.phone} required />
      <Input name="line1" label="Flat / house no., street" defaultValue={address?.line1} error={fe.line1} required className="sm:col-span-2" />
      <Input name="line2" label="Area / locality" defaultValue={address?.line2} className="sm:col-span-2" />
      <Input name="landmark" label="Landmark" defaultValue={address?.landmark} />
      <Input name="postalCode" label="PIN code" inputMode="numeric" maxLength={6} defaultValue={address?.postalCode} error={fe.postalCode} required />
      <Input name="city" label="City" defaultValue={address?.city} error={fe.city} required />
      <Select name="state" label="State" placeholder="Select state" defaultValue={address?.state} options={states.map((s) => ({ value: s, label: s }))} error={fe.state} required />
      <Checkbox name="isDefault" defaultChecked={address?.isDefault} label="Use as default address" className="sm:col-span-2" />
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button loading={pending} size="sm">Save address</Button>
        {onDone && <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>}
        <FormMessage error={state.fieldErrors ? null : state.error} />
      </div>
    </form>
  );
}

export function AddressBook({ addresses, states }: { addresses: Addr[]; states: readonly string[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {addresses.map((a) =>
          editing === a.id ? (
            <div key={a.id} className="sm:col-span-2"><AddressForm address={a} states={states} onDone={() => setEditing(null)} /></div>
          ) : (
            <div key={a.id} className="border border-line bg-white p-5 text-sm">
              <p className="font-semibold">{a.fullName} {a.isDefault && <span className="ml-2 text-xs text-gold">Default</span>}</p>
              <p className="text-muted">{a.line1}{a.line2 && `, ${a.line2}`}</p>
              <p className="text-muted">{a.city}, {a.state} {a.postalCode}</p>
              <p className="text-muted">{a.phone}</p>
              <div className="mt-3 flex gap-4 text-xs">
                <button onClick={() => setEditing(a.id!)} className="text-gold hover:underline">Edit</button>
                <button disabled={pending} onClick={() => confirm("Delete this address?") && start(() => deleteAddressAction(a.id!))} className="text-muted hover:text-danger">Delete</button>
              </div>
            </div>
          ),
        )}
      </div>
      {editing === "new" ? <AddressForm states={states} onDone={() => setEditing(null)} /> : <Button variant="outline" size="sm" onClick={() => setEditing("new")}>Add address</Button>}
    </div>
  );
}
