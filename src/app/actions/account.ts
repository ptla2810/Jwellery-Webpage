"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { hashPassword, passwordIssue, verifyPassword } from "@/lib/auth/password";
import { addressSchema, phoneSchema } from "@/lib/orders/service";
import { rateLimit } from "@/lib/rate-limit";
import type { FormState } from "./engagement";

function errs(e: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of e.issues) out[i.path.join(".")] ??= i.message;
  return out;
}

export async function updateProfileAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Enter your name").max(80),
      phone: z.union([z.literal(""), phoneSchema]),
      dateOfBirth: z.string().optional(),
      anniversary: z.string().optional(),
      marketingOptIn: z.string().optional(),
    })
    .safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: "Please correct the highlighted fields", fieldErrors: errs(parsed.error) };
  const d = parsed.data;
  const date = (v?: string) => (v ? new Date(v) : null);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: d.name,
      phone: d.phone || null,
      profile: {
        upsert: {
          create: { dateOfBirth: date(d.dateOfBirth), anniversary: date(d.anniversary), marketingOptIn: d.marketingOptIn === "on" },
          update: { dateOfBirth: date(d.dateOfBirth), anniversary: date(d.anniversary), marketingOptIn: d.marketingOptIn === "on" },
        },
      },
    },
  });
  revalidatePath("/account");
  return { ok: true, message: "Profile updated" };
}

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!(await rateLimit("change-pw", 5, 900, user.id))) return { error: "Too many attempts, try again later" };
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(current, record.passwordHash))) return { error: "Current password is incorrect", fieldErrors: { current: "Incorrect password" } };
  const issue = passwordIssue(next);
  if (issue) return { error: issue, fieldErrors: { password: issue } };
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: true, message: "Password changed" };
}

export async function saveAddressAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = addressSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: "Please correct the highlighted fields", fieldErrors: errs(parsed.error) };
  const id = String(form.get("id") ?? "");
  const isDefault = form.get("isDefault") === "on";
  const data = { ...parsed.data, line2: parsed.data.line2 || null, landmark: parsed.data.landmark || null, isDefault };
  await prisma.$transaction(async (tx) => {
    if (isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    if (id) {
      const owned = await tx.address.findFirst({ where: { id, userId: user.id } });
      if (!owned) throw new Error("Address not found");
      await tx.address.update({ where: { id }, data });
    } else {
      const count = await tx.address.count({ where: { userId: user.id } });
      if (count >= 20) throw new Error("You can save up to 20 addresses");
      await tx.address.create({ data: { ...data, isDefault: isDefault || count === 0, userId: user.id } });
    }
  });
  revalidatePath("/account/addresses");
  return { ok: true, message: "Address saved" };
}

export async function deleteAddressAction(id: string) {
  const user = await requireUser();
  await prisma.address.deleteMany({ where: { id: String(id), userId: user.id } });
  revalidatePath("/account/addresses");
}
