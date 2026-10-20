import type { PriceQuote } from "@/lib/pricing";
import { formatINR } from "@/lib/money";

export function OrderSummary({ quote, showShippingNote = true }: { quote: PriceQuote; showShippingNote?: boolean }) {
  const row = "flex justify-between text-sm";
  return (
    <dl className="space-y-2.5" data-testid="order-summary">
      <div className={row}>
        <dt className="text-muted">Subtotal</dt>
        <dd data-testid="summary-subtotal">{formatINR(quote.subtotal)}</dd>
      </div>
      {quote.compareAtSavings > 0 && (
        <div className={row}>
          <dt className="text-muted">You save on marked prices</dt>
          <dd className="text-success">{formatINR(quote.compareAtSavings)}</dd>
        </div>
      )}
      {quote.discountTotal > 0 && (
        <div className={row}>
          <dt className="text-muted">Coupon {quote.couponCode && <span className="font-medium text-ink">({quote.couponCode})</span>}</dt>
          <dd className="text-success" data-testid="summary-discount">− {formatINR(quote.discountTotal)}</dd>
        </div>
      )}
      <div className={row}>
        <dt className="text-muted">Shipping</dt>
        <dd data-testid="summary-shipping">{quote.shippingFee === 0 ? "Free" : formatINR(quote.shippingFee)}</dd>
      </div>
      {quote.codFee > 0 && (
        <div className={row}>
          <dt className="text-muted">Cash on delivery fee</dt>
          <dd>{formatINR(quote.codFee)}</dd>
        </div>
      )}
      {!quote.taxIncluded && (
        <div className={row}>
          <dt className="text-muted">GST ({quote.taxRateBps / 100}%)</dt>
          <dd>{formatINR(quote.taxTotal)}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
        <dt>Total</dt>
        <dd data-testid="summary-total">{formatINR(quote.total)}</dd>
      </div>
      {quote.taxIncluded && quote.taxTotal > 0 && (
        <p className="text-xs text-muted">Includes GST of {formatINR(quote.taxTotal, { exact: true })} ({quote.taxRateBps / 100}%)</p>
      )}
      {showShippingNote && quote.freeShippingRemaining > 0 && quote.subtotal > 0 && (
        <p className="rounded-[var(--radius-sm)] bg-gold-100/60 px-3 py-2 text-xs text-charcoal">
          Add {formatINR(quote.freeShippingRemaining)} more for free insured shipping.
        </p>
      )}
    </dl>
  );
}
