import "server-only";
import { cookies } from "next/headers";
import { isProduction } from "./env";
import { randomToken } from "./auth/tokens";

export const GUEST_COOKIE = "aurelle_guest";

export async function readGuestToken(): Promise<string | null> {
  const v = (await cookies()).get(GUEST_COOKIE)?.value;
  return v && /^[A-Za-z0-9_-]{30,64}$/.test(v) ? v : null;
}

/** Only callable from server actions / route handlers. */
export async function ensureGuestToken(): Promise<string> {
  const existing = await readGuestToken();
  if (existing) return existing;
  const token = randomToken();
  (await cookies()).set(GUEST_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 86_400,
  });
  return token;
}
