import type { MetalType } from "@prisma/client";

export const METAL_LABELS: Record<MetalType, string> = {
  YELLOW_GOLD: "Yellow Gold",
  WHITE_GOLD: "White Gold",
  ROSE_GOLD: "Rose Gold",
  PLATINUM: "Platinum",
  SILVER: "Sterling Silver",
};

export function metalSummary(metal: MetalType, purity: string): string {
  if (metal === "PLATINUM") return `Platinum ${purity}`;
  if (metal === "SILVER") return `${purity} Sterling Silver`;
  return `${purity} ${METAL_LABELS[metal]}`;
}

export const SORT_OPTIONS = [
  { value: "popular", label: "Popularity" },
  { value: "newest", label: "New arrivals" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;
export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export const PRICE_BANDS = [
  { label: "Under ₹10,000", min: 0, max: 10_000 },
  { label: "₹10,000 – ₹25,000", min: 10_000, max: 25_000 },
  { label: "₹25,000 – ₹50,000", min: 25_000, max: 50_000 },
  { label: "₹50,000 – ₹1,00,000", min: 50_000, max: 100_000 },
  { label: "₹1,00,000 – ₹2,50,000", min: 100_000, max: 250_000 },
  { label: "Above ₹2,50,000", min: 250_000, max: null },
] as const;

export const CARAT_BANDS = [
  { label: "Up to 0.25 ct", min: 0, max: 0.25 },
  { label: "0.25 – 0.50 ct", min: 0.25, max: 0.5 },
  { label: "0.50 – 1.00 ct", min: 0.5, max: 1 },
  { label: "Above 1.00 ct", min: 1, max: null },
] as const;
