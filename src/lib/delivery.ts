import type { ShippingSettings } from "./settings-defaults";

export const PINCODE_RE = /^[1-9][0-9]{5}$/;

export type DeliveryEstimate =
  | { serviceable: false; reason: string }
  | {
      serviceable: true;
      postalCode: string;
      standard: { from: Date; to: Date };
      express: { from: Date; to: Date } | null;
      codAvailable: boolean;
    };

function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added += 1; // no Sunday deliveries
  }
  return d;
}

export function estimateDelivery(postalCode: string, s: ShippingSettings, now = new Date()): DeliveryEstimate {
  const code = postalCode.trim();
  if (!PINCODE_RE.test(code)) return { serviceable: false, reason: "Please enter a valid 6-digit PIN code" };
  if (s.unserviceablePrefixes.some((p) => code.startsWith(p))) {
    return { serviceable: false, reason: "Sorry, we do not deliver to this PIN code yet" };
  }
  const metro = s.metroPrefixes.some((p) => code.startsWith(p));
  const cut = metro ? s.metroDaysReduction : 0;
  const [smin, smax] = s.standardDays;
  const [emin, emax] = s.expressDays;
  return {
    serviceable: true,
    postalCode: code,
    standard: { from: addBusinessDays(now, Math.max(1, smin - cut)), to: addBusinessDays(now, Math.max(1, smax - cut)) },
    express: s.expressEnabled
      ? { from: addBusinessDays(now, Math.max(1, emin)), to: addBusinessDays(now, Math.max(1, emax)) }
      : null,
    codAvailable: s.codEnabled,
  };
}

export function formatDateRange(from: Date, to: Date) {
  const f = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return from.toDateString() === to.toDateString() ? f.format(from) : `${f.format(from)} – ${f.format(to)}`;
}
