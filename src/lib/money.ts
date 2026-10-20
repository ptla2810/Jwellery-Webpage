/** All monetary values are integer paise. */
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});
const inrExact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

export function formatINR(paise: number, opts: { exact?: boolean } = {}): string {
  const rupees = paise / 100;
  if (opts.exact || !Number.isInteger(rupees)) return inrExact.format(rupees);
  return inr.format(rupees);
}

export function rupeesToPaise(rupees: number | string): number {
  const n = typeof rupees === "string" ? Number(rupees.replace(/[,₹\s]/g, "")) : rupees;
  if (!Number.isFinite(n)) throw new Error("Invalid amount");
  return Math.round(n * 100);
}

export function discountPercent(price: number, compareAt?: number | null): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.floor(((compareAt - price) / compareAt) * 100);
}
