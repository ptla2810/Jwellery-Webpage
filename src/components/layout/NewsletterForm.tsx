"use client";

import { useActionState } from "react";
import { subscribeNewsletter, type FormState } from "@/app/actions/engagement";
import { cn } from "@/lib/cn";

export function NewsletterForm({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribeNewsletter, {});
  return (
    <form action={action} className="w-full max-w-md" noValidate>
      <label htmlFor={`newsletter-${tone}`} className="sr-only">Email address</label>
      <div className={cn("flex border-b", tone === "dark" ? "border-ivory/40 focus-within:border-gold-300" : "border-ink/30 focus-within:border-gold")}>
        <input
          id={`newsletter-${tone}`}
          name="email"
          type="email"
          required
          placeholder="Your email address"
          aria-invalid={!!state.error || undefined}
          className={cn("h-12 flex-1 bg-transparent text-sm focus:outline-none focus-visible:outline-none", tone === "dark" ? "text-ivory placeholder:text-ivory/50" : "placeholder:text-muted")}
        />
        <button disabled={pending} className={cn("px-2 text-xs font-semibold uppercase tracking-[0.16em] disabled:opacity-50", tone === "dark" ? "text-gold-300 hover:text-ivory" : "text-gold hover:text-ink")}>
          {pending ? "…" : "Subscribe"}
        </button>
      </div>
      <p role={state.error ? "alert" : "status"} className={cn("mt-2 min-h-5 text-xs", state.error ? "text-[#f0a49a]" : tone === "dark" ? "text-gold-300" : "text-success")}>
        {state.error ?? state.message ?? ""}
      </p>
    </form>
  );
}
