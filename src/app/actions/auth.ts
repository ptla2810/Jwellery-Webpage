"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroyAllSessions, destroySession, getCurrentUser } from "@/lib/auth/session";
import { hashPassword, passwordIssue, verifyPassword } from "@/lib/auth/password";
import { randomToken, sha256 } from "@/lib/auth/tokens";
import { mergeGuestData } from "@/lib/cart";
import { readGuestToken } from "@/lib/guest";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { getSetting } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { phoneSchema } from "@/lib/orders/service";
import type { FormState } from "./engagement";

function safeNext(v: FormDataEntryValue | null, fallback = "/account") {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
}

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(120);
// Dummy hash so failed lookups take similar time to real verifications
const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==";

async function issueToken(userId: string, type: "EMAIL_VERIFICATION" | "PASSWORD_RESET", ttlMinutes: number) {
  const token = randomToken();
  await prisma.verificationToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.verificationToken.create({ data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMinutes * 60_000) } });
  return token;
}

async function sendVerification(user: { id: string; email: string; name: string }) {
  const token = await issueToken(user.id, "EMAIL_VERIFICATION", 60 * 24);
  const store = await getSetting("store");
  await sendEmail({
    to: user.email,
    subject: `Verify your email for ${store.name}`,
    text: `Hi ${user.name},\n\nPlease verify your email address:\n${siteUrl()}/verify-email?token=${token}\n\nThis link expires in 24 hours.`,
  });
}

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("register", 5, 3600))) return { error: "Too many sign-up attempts. Please try again later." };
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Please enter your name").max(80),
      email,
      phone: z.union([z.literal(""), phoneSchema]),
      password: z.string().max(128),
      marketing: z.string().optional(),
    })
    .safeParse({ ...Object.fromEntries(form.entries()), phone: form.get("phone") ?? "" });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] ??= i.message;
    return { error: "Please correct the highlighted fields", fieldErrors: fe };
  }
  const pwIssue = passwordIssue(parsed.data.password);
  if (pwIssue) return { error: pwIssue, fieldErrors: { password: pwIssue } };
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "An account with this email already exists. Please sign in.", fieldErrors: { email: "Already registered" } };
  const role = await prisma.role.findUniqueOrThrow({ where: { key: "customer" } });
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      passwordHash: await hashPassword(parsed.data.password),
      roleId: role.id,
      profile: { create: { marketingOptIn: parsed.data.marketing === "on" } },
    },
  });
  if (parsed.data.marketing === "on") {
    await prisma.newsletterSubscription.upsert({ where: { email: user.email }, create: { email: user.email, source: "register" }, update: { status: "SUBSCRIBED" } });
  }
  await sendVerification(user);
  const guest = await readGuestToken();
  await createSession(user.id);
  await mergeGuestData(user.id, guest);
  redirect(safeNext(form.get("next"), "/account?welcome=1"));
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const parsedEmail = email.safeParse(form.get("email"));
  const password = String(form.get("password") ?? "");
  if (!parsedEmail.success || !password) return { error: "Enter your email and password" };
  if (!(await rateLimit("login-ip", 20, 900)) || !(await rateLimit("login-email", 8, 900, parsedEmail.data))) {
    return { error: "Too many sign-in attempts. Please wait 15 minutes and try again." };
  }
  const user = await prisma.user.findUnique({ where: { email: parsedEmail.data } });
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.isActive) return { error: "Incorrect email or password" };
  const guest = await readGuestToken();
  await createSession(user.id);
  await mergeGuestData(user.id, guest);
  const role = await prisma.role.findUnique({ where: { id: user.roleId } });
  if (role && role.key !== "customer") await audit(user.id, "auth.login", "User", user.id);
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("forgot", 5, 3600))) return { error: "Too many requests. Please try again later." };
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const user = await prisma.user.findUnique({ where: { email: parsed.data } });
  if (user && user.isActive) {
    const token = await issueToken(user.id, "PASSWORD_RESET", 60);
    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      text: `Hi ${user.name},\n\nReset your password using this link (valid for 1 hour):\n${siteUrl()}/reset-password?token=${token}\n\nIf you didn't request this, you can ignore this email.`,
    });
  }
  // Same response either way to avoid revealing which emails are registered
  return { ok: true, message: "If an account exists for that email, we've sent a password reset link." };
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("reset", 10, 3600))) return { error: "Too many attempts. Please try again later." };
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password !== String(form.get("confirm") ?? "")) return { error: "Passwords do not match", fieldErrors: { confirm: "Passwords do not match" } };
  const issue = passwordIssue(password);
  if (issue) return { error: issue, fieldErrors: { password: issue } };
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.type !== "PASSWORD_RESET" || record.usedAt || record.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired. Please request a new one." };
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
    prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  await destroyAllSessions(record.userId);
  return { ok: true, message: "Your password has been updated. You can now sign in." };
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.type !== "EMAIL_VERIFICATION" || record.usedAt || record.expiresAt < new Date()) return false;
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  return true;
}

export async function resendVerificationAction(): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in" };
  if (user.emailVerified) return { ok: true, message: "Your email is already verified" };
  if (!(await rateLimit("verify-resend", 3, 3600, user.id))) return { error: "Please wait before requesting another email" };
  await sendVerification(user);
  return { ok: true, message: "Verification email sent" };
}
