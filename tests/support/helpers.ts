import { prisma } from "@/lib/db";
import { cookieJar } from "./setup";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { randomToken } from "@/lib/auth/tokens";
import type { CheckoutInput } from "@/lib/orders/service";

export function asGuest() {
  cookieJar.clear();
}

export async function asUser(roleKey: "customer" | "admin" | "staff", email = `${roleKey}-${randomToken(4)}@example.com`) {
  cookieJar.clear();
  const role = await prisma.role.findUniqueOrThrow({ where: { key: roleKey } });
  const user = await prisma.user.create({ data: { email: email.toLowerCase(), name: `Test ${roleKey}`, passwordHash: await hashPassword("Testpass123"), roleId: role.id } });
  await createSession(user.id);
  return user;
}

export async function variantBySku(sku: string) {
  return prisma.productVariant.findUniqueOrThrow({ where: { sku }, include: { inventory: true, product: true } });
}

export async function setStock(sku: string, quantity: number) {
  const v = await variantBySku(sku);
  await prisma.inventory.update({ where: { variantId: v.id }, data: { quantity } });
  await prisma.product.update({ where: { id: v.productId }, data: { inStock: quantity > 0 } });
  return v;
}

export function checkoutInput(over: Partial<CheckoutInput> = {}): CheckoutInput {
  return {
    checkoutToken: randomToken(24),
    contact: { name: "Asha Rao", email: "asha@example.com", phone: "9876543210" },
    address: { fullName: "Asha Rao", phone: "9876543210", line1: "12 MG Road, Indiranagar", line2: "", landmark: "", city: "Bengaluru", state: "Karnataka", postalCode: "560038" },
    deliveryOption: "standard",
    paymentMethod: "COD",
    customerNote: "",
    ...over,
  };
}
