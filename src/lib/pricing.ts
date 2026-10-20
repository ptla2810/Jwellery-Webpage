/**
 * Pure, server-side price engine. All inputs/outputs are integer paise.
 * The browser never supplies prices — callers must load unit prices from the database.
 */
import type { ShippingSettings, TaxSettings } from "./settings-defaults";

export type PricingLine = {
  key: string;
  unitPrice: number;
  compareAtPrice?: number | null;
  quantity: number;
};

export type CouponRule = {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minSubtotal: number;
  maxDiscount?: number | null;
};

export type DeliveryOption = "standard" | "express";
export type PaymentChoice = "RAZORPAY" | "COD" | "TEST_SIMULATOR";

export type PricedLine = PricingLine & {
  lineSubtotal: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
};

export type PriceQuote = {
  lines: PricedLine[];
  subtotal: number;
  compareAtSavings: number;
  discountTotal: number;
  couponCode: string | null;
  couponError: string | null;
  shippingFee: number;
  codFee: number;
  taxTotal: number;
  taxRateBps: number;
  taxIncluded: boolean;
  total: number;
  freeShippingRemaining: number;
};

export function couponDiscount(subtotal: number, coupon: CouponRule): { amount: number; error: string | null } {
  if (subtotal < coupon.minSubtotal) {
    return { amount: 0, error: `Add items worth ₹${Math.ceil((coupon.minSubtotal - subtotal) / 100).toLocaleString("en-IN")} more to use ${coupon.code}` };
  }
  let amount = coupon.type === "PERCENT" ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount != null) amount = Math.min(amount, coupon.maxDiscount);
  return { amount: Math.max(0, Math.min(amount, subtotal)), error: null };
}

/** Split `total` across weights proportionally using the largest-remainder method (sums exactly). */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0 || total === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const floors = raw.map(Math.floor);
  let remainder = total - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] += 1;
    remainder -= 1;
  }
  return floors;
}

export function taxPortion(amount: number, rateBps: number, included: boolean): number {
  if (rateBps <= 0) return 0;
  return included ? Math.round((amount * rateBps) / (10_000 + rateBps)) : Math.round((amount * rateBps) / 10_000);
}

export function quote(input: {
  lines: PricingLine[];
  coupon?: CouponRule | null;
  shipping: ShippingSettings;
  tax: TaxSettings;
  deliveryOption?: DeliveryOption;
  paymentMethod?: PaymentChoice;
}): PriceQuote {
  const { shipping, tax } = input;
  for (const l of input.lines) {
    if (!Number.isInteger(l.unitPrice) || l.unitPrice < 0) throw new Error("Invalid unit price");
    if (!Number.isInteger(l.quantity) || l.quantity < 1) throw new Error("Invalid quantity");
  }
  const subtotals = input.lines.map((l) => l.unitPrice * l.quantity);
  const subtotal = subtotals.reduce((a, b) => a + b, 0);
  const compareAtSavings = input.lines.reduce(
    (acc, l) => acc + (l.compareAtPrice && l.compareAtPrice > l.unitPrice ? (l.compareAtPrice - l.unitPrice) * l.quantity : 0),
    0,
  );

  let discountTotal = 0;
  let couponError: string | null = null;
  if (input.coupon) {
    const r = couponDiscount(subtotal, input.coupon);
    discountTotal = r.amount;
    couponError = r.error;
  }
  const discounts = allocate(discountTotal, subtotals);

  const lines: PricedLine[] = input.lines.map((l, i) => {
    const net = subtotals[i] - discounts[i];
    const taxAmount = taxPortion(net, tax.gstRateBps, tax.pricesIncludeTax);
    return {
      ...l,
      lineSubtotal: subtotals[i],
      discountAmount: discounts[i],
      taxAmount,
      lineTotal: tax.pricesIncludeTax ? net : net + taxAmount,
    };
  });

  const merchandise = subtotal - discountTotal;
  const qualifiesFree = merchandise >= shipping.freeShippingThreshold;
  let shippingFee = input.lines.length === 0 || qualifiesFree ? 0 : shipping.standardFee;
  if (input.deliveryOption === "express" && input.lines.length > 0) {
    if (!shipping.expressEnabled) throw new Error("Express delivery is not available");
    shippingFee += shipping.expressFee;
  }
  const codFee = input.paymentMethod === "COD" ? shipping.codFee : 0;
  const taxTotal = lines.reduce((a, l) => a + l.taxAmount, 0);
  const total = lines.reduce((a, l) => a + l.lineTotal, 0) + shippingFee + codFee;

  return {
    lines,
    subtotal,
    compareAtSavings,
    discountTotal,
    couponCode: input.coupon && !couponError ? input.coupon.code : null,
    couponError,
    shippingFee,
    codFee,
    taxTotal,
    taxRateBps: tax.gstRateBps,
    taxIncluded: tax.pricesIncludeTax,
    total,
    freeShippingRemaining: qualifiesFree ? 0 : Math.max(0, shipping.freeShippingThreshold - merchandise),
  };
}
