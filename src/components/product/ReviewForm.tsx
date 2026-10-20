"use client";

import { useActionState, useState } from "react";
import { submitReview, type FormState } from "@/app/actions/engagement";
import { Input, Textarea, FormMessage } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function ReviewForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitReview, {});
  const [rating, setRating] = useState(0);
  if (state.ok) return <FormMessage success={state.message} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="productId" value={productId} />
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em]">Your rating</legend>
        <div className="flex gap-1" role="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer text-2xl leading-none">
              <input type="radio" name="rating" value={n} className="sr-only" onChange={() => setRating(n)} />
              <span className={n <= rating ? "text-gold-500" : "text-sand"} aria-label={`${n} star${n > 1 ? "s" : ""}`}>★</span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.rating && <p className="mt-1 text-xs text-danger">{state.fieldErrors.rating}</p>}
      </fieldset>
      <Input name="title" label="Title" maxLength={100} error={state.fieldErrors?.title} />
      <Textarea name="body" label="Review" maxLength={2000} error={state.fieldErrors?.body} />
      <FormMessage error={state.fieldErrors ? null : state.error} />
      <Button loading={pending}>Submit review</Button>
    </form>
  );
}
