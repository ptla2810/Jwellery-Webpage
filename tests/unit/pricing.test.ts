import { describe, expect, it } from "vitest";
import { allocate, couponDiscount, quote, taxPortion } from "@/lib/pricing";
import { settingDefaults } from "@/lib/settings-defaults";

const shipping = settingDefaults.shipping;
const tax = settingDefaults.tax;

describe("allocate", () => {
  it("splits exactly and proportionally", () => {
    const parts = allocate(1000, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
  });
  it("handles zero", () => expect(allocate(0, [5, 5])).toEqual([0, 0]));
});

describe("taxPortion", () => {
  it("extracts 3% GST from inclusive price", () => expect(taxPortion(103_00, 300, true)).toBe(3_00));
  it("adds 3% GST to exclusive price", () => expect(taxPortion(100_00, 300, false)).toBe(3_00));
});

describe("couponDiscount", () => {
  const pct = { code: "TEN", type: "PERCENT" as const, value: 10, minSubtotal: 10_000_00, maxDiscount: 5_000_00 };
  it("applies percentage with cap", () => {
    expect(couponDiscount(20_000_00, pct)).toEqual({ amount: 2_000_00, error: null });
    expect(couponDiscount(1_00_000_00, pct).amount).toBe(5_000_00);
  });
  it("enforces minimum subtotal", () => {
    const r = couponDiscount(5_000_00, pct);
    expect(r.amount).toBe(0);
    expect(r.error).toMatch(/more to use TEN/);
  });
  it("never exceeds subtotal for fixed coupons", () => {
    expect(couponDiscount(1_000_00, { code: "F", type: "FIXED", value: 5_000_00, minSubtotal: 0 }).amount).toBe(1_000_00);
  });
});

describe("quote", () => {
  const lines = [
    { key: "a", unitPrice: 10_300_00, quantity: 2, compareAtPrice: 12_000_00 },
    { key: "b", unitPrice: 5_150_00, quantity: 1 },
  ];
  it("computes subtotal, shipping, GST and total", () => {
    const q = quote({ lines, shipping, tax });
    expect(q.subtotal).toBe(25_750_00);
    expect(q.shippingFee).toBe(0); // above ₹25,000 free shipping threshold
    expect(q.total).toBe(25_750_00);
    expect(q.taxTotal).toBe(Math.round((20_600_00 * 300) / 10_300) + Math.round((5_150_00 * 300) / 10_300));
    expect(q.compareAtSavings).toBe(2 * 1_700_00);
  });
  it("charges shipping below threshold and adds express & COD fees", () => {
    const q = quote({ lines: [{ key: "x", unitPrice: 5_000_00, quantity: 1 }], shipping: { ...shipping, codFee: 50_00 }, tax, deliveryOption: "express", paymentMethod: "COD" });
    expect(q.shippingFee).toBe(shipping.standardFee + shipping.expressFee);
    expect(q.codFee).toBe(50_00);
    expect(q.total).toBe(5_000_00 + shipping.standardFee + shipping.expressFee + 50_00);
    expect(q.freeShippingRemaining).toBe(shipping.freeShippingThreshold - 5_000_00);
  });
  it("applies coupon discounts before the free shipping check", () => {
    const q = quote({ lines: [{ key: "x", unitPrice: 26_000_00, quantity: 1 }], shipping, tax, coupon: { code: "F", type: "FIXED", value: 2_000_00, minSubtotal: 0 } });
    expect(q.discountTotal).toBe(2_000_00);
    expect(q.shippingFee).toBe(shipping.standardFee);
    expect(q.total).toBe(24_000_00 + shipping.standardFee);
  });
  it("rejects invalid quantities and prices", () => {
    expect(() => quote({ lines: [{ key: "x", unitPrice: 100, quantity: 0 }], shipping, tax })).toThrow();
    expect(() => quote({ lines: [{ key: "x", unitPrice: 1.5, quantity: 1 }], shipping, tax })).toThrow();
  });
  it("adds GST when prices exclude tax", () => {
    const q = quote({ lines: [{ key: "x", unitPrice: 30_000_00, quantity: 1 }], shipping, tax: { ...tax, pricesIncludeTax: false } });
    expect(q.taxTotal).toBe(900_00);
    expect(q.total).toBe(30_900_00);
  });
});
