import "server-only";
import { headers } from "next/headers";
import { siteUrl } from "./env";

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** CSRF defence for JSON route handlers: require same-origin requests. Server Actions do this automatically. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    const o = new URL(origin);
    return o.host === host || o.origin === siteUrl();
  } catch {
    return false;
  }
}
