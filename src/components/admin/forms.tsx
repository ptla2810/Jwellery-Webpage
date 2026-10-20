"use client";

import { useActionState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/cn";

export type AdminState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string>; redirectTo?: string };
type Action = (state: AdminState, form: FormData) => Promise<AdminState>;

/** Form wrapper bound to a server action; shows the result inline and as a toast. */
export function AdminForm({ action, children, submitLabel = "Save", className }: { action: Action; children: ReactNode | ((s: AdminState) => ReactNode); submitLabel?: string; className?: string }) {
  const toast = useToast();
  const router = useRouter();
  const [state, formAction, pending] = useActionState<AdminState, FormData>(async (s, f) => {
    const r = await action(s, f);
    if (r.ok) {
      toast(r.message ?? "Saved");
      if (r.redirectTo) router.push(r.redirectTo);
      else router.refresh();
    }
    return r;
  }, {});
  return (
    <form action={formAction} className={cn("space-y-4", className)} noValidate>
      {typeof children === "function" ? children(state) : children}
      <FormMessage error={state.error} />
      <Button loading={pending} size="sm">{submitLabel}</Button>
    </form>
  );
}

/** One-click server action button (optionally confirmed). */
export function ActionButton({ action, label, confirmText, variant = "outline", className }: { action: () => Promise<AdminState | void>; label: string; confirmText?: string; variant?: "outline" | "primary" | "danger" | "ghost" | "gold"; className?: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      className={className}
      loading={pending}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        start(async () => {
          const r = await action();
          if (r && r.error) toast(r.error, "error");
          else toast(r?.message ?? "Done");
          router.refresh();
        });
      }}
    >
      {label}
    </Button>
  );
}

export function AField({ label, children, error, hint, className }: { label: string; children: ReactNode; error?: string; hint?: string; className?: string }) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-xs font-semibold text-charcoal">{label}</span>
      {children}
      {error ? <span className="block text-xs text-danger">{error}</span> : hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputCls = "w-full rounded-[var(--radius-sm)] border border-line bg-white px-3 py-2 text-sm focus:border-gold focus:outline-none aria-[invalid=true]:border-danger";
