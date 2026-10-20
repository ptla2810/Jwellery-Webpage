import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "../db";
import { isProduction } from "../env";
import type { PermissionKey } from "./permissions";
import { randomToken, sha256 } from "./tokens";

export const SESSION_COOKIE = "aurelle_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  roleKey: string;
  roleName: string;
  permissions: Set<PermissionKey>;
  emailVerified: boolean;
};

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const ua = (await headers()).get("user-agent")?.slice(0, 200) ?? null;
  await prisma.session.create({ data: { tokenHash: sha256(token), userId, expiresAt, userAgent: ua } });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  store.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  // sliding refresh at most once per hour
  if (Date.now() - session.lastUsedAt.getTime() > 3_600_000) {
    await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    roleKey: u.role.key,
    roleName: u.role.name,
    permissions: new Set(u.role.permissions.map((rp) => rp.permission.key as PermissionKey)),
    emailVerified: !!u.emailVerifiedAt,
  };
});

export async function requireUser(returnTo = "/account"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

export class AuthorizationError extends Error {
  constructor(message = "You are not allowed to perform this action") {
    super(message);
  }
}

export function hasPermission(user: SessionUser | null, permission: PermissionKey): boolean {
  return !!user && user.permissions.has(permission);
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function assertPermission(permission: PermissionKey): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || !user.permissions.has(permission)) throw new AuthorizationError();
  return user;
}

/** For admin pages: redirect anonymous users to login, show 403 for others. */
export async function requirePermissionPage(permission: PermissionKey, returnTo = "/admin"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (!user.permissions.has(permission)) redirect("/forbidden");
  return user;
}
