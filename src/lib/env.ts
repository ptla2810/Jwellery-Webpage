export const isProduction = process.env.NODE_ENV === "production";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (isProduction) throw new Error("AUTH_SECRET must be set to at least 32 characters in production");
    return "development-only-insecure-secret-change-me-please";
  }
  return secret;
}

export function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret, webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || null };
}

/** Simulated test payments: never available in production builds. */
export function paymentSimulatorEnabled(): boolean {
  return !isProduction && process.env.DEV_PAYMENT_SIMULATOR === "true";
}
