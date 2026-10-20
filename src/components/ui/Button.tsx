import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "gold" | "outline" | "ghost" | "link" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium tracking-wide transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 rounded-[var(--radius-sm)] whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-ivory hover:bg-charcoal",
  gold: "bg-gold text-white hover:bg-[#7d5e26]",
  outline: "border border-ink text-ink hover:bg-ink hover:text-ivory",
  ghost: "text-ink hover:bg-cream",
  link: "text-ink underline underline-offset-4 decoration-gold-300 hover:decoration-gold px-0",
  danger: "bg-danger text-white hover:bg-[#8a2b22]",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-xs uppercase tracking-[0.12em]",
  md: "h-11 px-6 text-xs uppercase tracking-[0.14em]",
  lg: "h-13 px-8 text-sm uppercase tracking-[0.16em]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], variant !== "link" && sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function ButtonLink({ variant = "primary", size = "md", className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
