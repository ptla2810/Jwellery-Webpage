import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-[var(--radius-sm)] border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 transition-colors focus:border-gold focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-gold-100 disabled:bg-cream aria-[invalid=true]:border-danger";

type FieldWrap = { label: string; error?: string | null; hint?: ReactNode; id: string; className?: string; required?: boolean };

function Wrap({ label, error, hint, id, className, required, children }: FieldWrap & { children: ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-[0.12em] text-charcoal">
        {label}
        {required && <span className="text-danger" aria-hidden> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & Omit<FieldWrap, "id"> & { id?: string; name: string };
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, hint, className, id, required, ...rest }, ref) {
  const fid = id ?? rest.name;
  return (
    <Wrap label={label} error={error} hint={hint} id={fid} className={className} required={required}>
      <input ref={ref} id={fid} required={required} aria-invalid={!!error || undefined} aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined} className={control} {...rest} />
    </Wrap>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & Omit<FieldWrap, "id"> & { id?: string; name: string; options: { value: string; label: string }[]; placeholder?: string };
export function Select({ label, error, hint, className, id, options, placeholder, required, ...rest }: SelectProps) {
  const fid = id ?? rest.name;
  return (
    <Wrap label={label} error={error} hint={hint} id={fid} className={className} required={required}>
      <select id={fid} required={required} aria-invalid={!!error || undefined} className={cn(control, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b635a%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:12px] bg-[right_0.9rem_center] bg-no-repeat pr-9")} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Wrap>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & Omit<FieldWrap, "id"> & { id?: string; name: string };
export function Textarea({ label, error, hint, className, id, required, ...rest }: TextareaProps) {
  const fid = id ?? rest.name;
  return (
    <Wrap label={label} error={error} hint={hint} id={fid} className={className} required={required}>
      <textarea id={fid} required={required} aria-invalid={!!error || undefined} className={cn(control, "min-h-28")} {...rest} />
    </Wrap>
  );
}

export function Checkbox({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; name: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-sm text-charcoal", className)}>
      <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-gold)]" {...rest} />
      <span>{label}</span>
    </label>
  );
}

export function FormMessage({ error, success }: { error?: string | null; success?: string | null }) {
  if (!error && !success) return null;
  return (
    <p role={error ? "alert" : "status"} className={cn("rounded-[var(--radius-sm)] border px-3 py-2 text-sm", error ? "border-danger/30 bg-danger/5 text-danger" : "border-success/30 bg-success/5 text-success")}>
      {error ?? success}
    </p>
  );
}
