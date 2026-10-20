"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Minus, Plus, ShieldCheck } from "lucide-react";
import { useStore } from "@/components/providers/StoreProvider";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/misc";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/cn";
import { WishlistButton } from "./WishlistButton";

export type PanelVariant = {
  id: string;
  sku: string;
  name: string;
  size: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  isDefault: boolean;
  metalValue: number | null;
  makingCharges: number | null;
  stoneValue: number | null;
  grossWeight: string | null;
};

export function PurchasePanel({
  productId,
  name,
  variants,
  sizeLabel,
  taxRateBps,
  taxIncluded,
  isPriceEstimated,
}: {
  productId: string;
  name: string;
  variants: PanelVariant[];
  sizeLabel: string;
  taxRateBps: number;
  taxIncluded: boolean;
  isPriceEstimated: boolean;
}) {
  const router = useRouter();
  const { addToCart, adding } = useStore();
  const hasSizes = variants.length > 1 || !!variants[0]?.size;
  const [selectedId, setSelectedId] = useState<string | null>(hasSizes ? null : variants[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const display = variants.find((v) => v.id === selectedId) ?? variants.find((v) => v.isDefault) ?? variants[0];
  const selected = variants.find((v) => v.id === selectedId) ?? null;
  const maxQty = Math.min(5, selected?.stock ?? display?.stock ?? 0);
  const allOut = variants.every((v) => v.stock <= 0);

  const breakdown = useMemo(() => {
    if (!display || display.metalValue == null || display.makingCharges == null) return null;
    const pre = display.metalValue + display.makingCharges + (display.stoneValue ?? 0);
    const tax = taxIncluded ? display.price - pre : Math.round((pre * taxRateBps) / 10_000);
    return { metal: display.metalValue, making: display.makingCharges, stone: display.stoneValue, tax, total: display.price };
  }, [display, taxIncluded, taxRateBps]);

  const act = async (buyNow: boolean) => {
    if (!selected) {
      setError(`Please select a ${sizeLabel.toLowerCase()}`);
      document.getElementById("variant-group")?.focus();
      return;
    }
    setError(null);
    const ok = await addToCart(selected.id, qty, { openDrawer: !buyNow });
    if (ok && buyNow) router.push("/checkout");
  };

  if (!display) return <p className="text-danger">This product is currently unavailable.</p>;
  return (
    <div className="space-y-6">
      <div>
        <Price price={display.price} compareAt={display.compareAtPrice} size="lg" />
        <p className="mt-1 text-xs text-muted">
          {taxIncluded ? `Inclusive of ${taxRateBps / 100}% GST` : `Excludes ${taxRateBps / 100}% GST`}
          {isPriceEstimated && " · Estimated price — the final invoice reflects the actual weight and prevailing metal rate"}
        </p>
      </div>

      {hasSizes && (
        <fieldset>
          <div className="mb-2 flex items-center justify-between">
            <legend className="text-xs font-semibold uppercase tracking-[0.14em]">{sizeLabel}</legend>
            {selected && <span className="text-xs text-muted">SKU {selected.sku}</span>}
          </div>
          <div id="variant-group" tabIndex={-1} role="radiogroup" aria-label={sizeLabel} aria-invalid={!!error || undefined} className="flex flex-wrap gap-2 outline-none">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={selectedId === v.id}
                disabled={v.stock <= 0}
                onClick={() => {
                  setSelectedId(v.id);
                  setQty(1);
                  setError(null);
                }}
                className={cn(
                  "min-w-14 border px-3 py-2 text-sm transition-colors",
                  selectedId === v.id ? "border-ink bg-ink text-ivory" : "border-line bg-white hover:border-ink",
                  v.stock <= 0 && "cursor-not-allowed text-muted line-through opacity-60 hover:border-line",
                )}
                data-testid="variant-option"
              >
                {v.size ?? v.name}
              </button>
            ))}
          </div>
          {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
        </fieldset>
      )}

      <p className={cn("text-sm font-medium", allOut || (selected && selected.stock <= 0) ? "text-danger" : !selected ? "text-charcoal" : selected.stock <= 3 ? "text-wine" : "text-success")} data-testid="stock-status">
        {allOut ? "Out of stock" : selected ? (selected.stock <= 0 ? "Out of stock in this size" : selected.stock <= 3 ? `Only ${selected.stock} left` : "In stock") : "In stock — select a size"}
      </p>

      <div className="flex items-center gap-3">
        <div className="flex h-12 items-center border border-line bg-white">
          <button type="button" className="px-3 disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity"><Minus className="size-4" /></button>
          <span className="w-8 text-center text-sm" aria-live="polite" aria-label="Quantity">{qty}</span>
          <button type="button" className="px-3 disabled:opacity-40" onClick={() => setQty((q) => Math.min(maxQty || 1, q + 1))} disabled={qty >= maxQty} aria-label="Increase quantity"><Plus className="size-4" /></button>
        </div>
        <WishlistButton productId={productId} name={name} withLabel className="h-12 flex-1 border border-line bg-white text-xs font-semibold uppercase tracking-[0.14em] hover:border-ink" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button size="lg" variant="outline" onClick={() => act(false)} loading={adding} disabled={allOut} data-testid="add-to-cart">Add to bag</Button>
        <Button size="lg" onClick={() => act(true)} disabled={allOut || adding} data-testid="buy-now">Buy now</Button>
      </div>

      {breakdown && (
        <details className="border border-line bg-white">
          <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]">Price breakdown</summary>
          <dl className="space-y-1.5 border-t border-line px-4 py-3 text-sm" data-testid="price-breakdown">
            <div className="flex justify-between"><dt className="text-muted">Metal{display.grossWeight ? ` (${display.grossWeight} g)` : ""}</dt><dd>{formatINR(breakdown.metal)}</dd></div>
            {breakdown.stone != null && breakdown.stone > 0 && <div className="flex justify-between"><dt className="text-muted">Stones</dt><dd>{formatINR(breakdown.stone)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Making charges</dt><dd>{formatINR(breakdown.making)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">GST ({taxRateBps / 100}%)</dt><dd>{formatINR(breakdown.tax)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd>{formatINR(breakdown.total)}</dd></div>
            {isPriceEstimated && <p className="pt-1 text-xs text-muted">Estimate based on approximate weight. Final price is confirmed on the invoice.</p>}
          </dl>
        </details>
      )}
      <p className="flex items-center gap-2 text-xs text-muted"><ShieldCheck className="size-4 text-gold" /> Secure checkout · We never store your card details</p>
    </div>
  );
}
