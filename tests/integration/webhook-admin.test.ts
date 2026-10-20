import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { prisma } from "@/lib/db";
import { addItem } from "@/lib/cart";
import { placeOrder } from "@/lib/orders/service";
import { assertPermission, AuthorizationError } from "@/lib/auth/session";
import { saveProductAction } from "@/app/admin/products/actions";
import { changeStatusAction } from "@/app/admin/orders/actions";
import { POST as webhook } from "@/app/api/payments/razorpay/webhook/route";
import { asGuest, asUser, checkoutInput, setStock, variantBySku } from "../support/helpers";

describe("Razorpay webhook", () => {
  const secret = "whsec_test_123";
  beforeAll(() => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_dummy";
    process.env.RAZORPAY_KEY_SECRET = "dummy_secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
  });
  afterAll(() => {
    process.env.RAZORPAY_KEY_ID = "";
    process.env.RAZORPAY_KEY_SECRET = "";
    process.env.RAZORPAY_WEBHOOK_SECRET = "";
  });

  async function pendingWithProviderOrder(providerOrderId: string) {
    await setStock("AUR-PD-001", 5);
    asGuest();
    await addItem((await variantBySku("AUR-PD-001")).id, 1);
    // Create order without hitting the Razorpay API: use the simulator path, then re-label the payment
    process.env.RAZORPAY_KEY_ID = "";
    const r = await placeOrder(checkoutInput({ paymentMethod: "TEST_SIMULATOR" }), null);
    process.env.RAZORPAY_KEY_ID = "rzp_test_dummy";
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: r.orderId } });
    await prisma.payment.update({ where: { id: payment.id }, data: { providerOrderId } });
    return { orderId: r.orderId, amount: payment.amount };
  }

  const send = (body: object, opts: { sig?: string; eventId?: string } = {}) => {
    const raw = JSON.stringify(body);
    const sig = opts.sig ?? createHmac("sha256", secret).update(raw).digest("hex");
    return webhook(new Request("http://localhost/api/payments/razorpay/webhook", { method: "POST", body: raw, headers: { "x-razorpay-signature": sig, "x-razorpay-event-id": opts.eventId ?? "evt_1" } }));
  };

  it("rejects invalid signatures", async () => {
    const res = await send({ event: "payment.captured", payload: {} }, { sig: "deadbeef" });
    expect(res.status).toBe(401);
  });

  it("captures once and treats repeated deliveries as duplicates", async () => {
    const o = await pendingWithProviderOrder("order_wh_1");
    const event = { event: "payment.captured", payload: { payment: { entity: { id: "pay_wh_1", order_id: "order_wh_1", amount: o.amount, status: "captured", method: "upi" } } } };
    const first = await send(event, { eventId: "evt_cap_1" });
    expect(first.status).toBe(200);
    const second = await send(event, { eventId: "evt_cap_1" });
    expect(await second.json()).toEqual({ status: "duplicate" });
    // a different event id for the same payment is still idempotent at the payment level
    const third = await send(event, { eventId: "evt_cap_2" });
    expect(third.status).toBe(200);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: o.orderId }, include: { payments: true } });
    expect(order.status).toBe("CONFIRMED");
    expect(order.payments.filter((p) => p.status === "CAPTURED")).toHaveLength(1);
  });

  it("records failed payments without confirming the order", async () => {
    const o = await pendingWithProviderOrder("order_wh_2");
    await send({ event: "payment.failed", payload: { payment: { entity: { id: "pay_wh_2", order_id: "order_wh_2", amount: o.amount, status: "failed", error_code: "BAD_REQUEST_ERROR", error_description: "Payment declined" } } } }, { eventId: "evt_fail_1" });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: o.orderId } });
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.paymentStatus).toBe("FAILED");
  });
});

function productForm(over: Record<string, string> = {}, variants?: object[]) {
  const f = new FormData();
  const fields: Record<string, string> = {
    name: "Test Halo Pendant",
    slug: "",
    sku: "TST-PD-001",
    shortDescription: "A test pendant created by the automated suite.",
    description: "Created by automated tests to verify admin product management.",
    careInstructions: "",
    status: "DRAFT",
    metalType: "YELLOW_GOLD",
    purity: "18K",
    gender: "WOMEN",
    style: "Minimal",
    gemstoneType: "",
    diamondClarity: "",
    diamondColor: "",
    diamondCarat: "",
    grossWeight: "2.1",
    netWeight: "2.0",
    certification: "",
    seoTitle: "",
    seoDescription: "",
    ...over,
  };
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  f.set("variants", JSON.stringify(variants ?? [{ sku: "TST-PD-001", name: "Standard", size: "", price: "15990", compareAtPrice: "", metalValue: "", makingCharges: "", stoneValue: "", grossWeight: "", stock: 4, isActive: true, isDefault: true }]));
  f.set("attributes", JSON.stringify([{ group: "Details", name: "Finish", value: "High polish" }]));
  return f;
}

describe("admin authorization & product management", () => {
  it("blocks customers and anonymous users from admin operations", async () => {
    asGuest();
    await expect(assertPermission("products.write")).rejects.toBeInstanceOf(AuthorizationError);
    await asUser("customer");
    await expect(assertPermission("admin.access")).rejects.toBeInstanceOf(AuthorizationError);
    const cats = await prisma.category.findFirstOrThrow({ where: { slug: "pendants" } });
    const res = await saveProductAction({}, productForm({ primaryCategoryId: cats.id }));
    expect(res.ok).toBeFalsy();
    expect(res.error).toMatch(/not allowed/i);
    expect(await prisma.product.count({ where: { sku: "TST-PD-001" } })).toBe(0);
    const order = await prisma.order.findFirstOrThrow();
    expect((await changeStatusAction(order.id, "CANCELLED")).error).toMatch(/not allowed/i);
  });

  it("staff without products.write cannot edit products", async () => {
    await asUser("staff");
    const cats = await prisma.category.findFirstOrThrow({ where: { slug: "pendants" } });
    expect((await saveProductAction({}, productForm({ primaryCategoryId: cats.id }))).error).toMatch(/not allowed/i);
  });

  it("lets administrators create and edit products with variants and stock", async () => {
    const admin = await asUser("admin");
    const cat = await prisma.category.findFirstOrThrow({ where: { slug: "pendants" } });
    const created = await saveProductAction({}, productForm({ primaryCategoryId: cat.id }));
    expect(created.ok).toBe(true);
    const p = await prisma.product.findUniqueOrThrow({ where: { sku: "TST-PD-001" }, include: { variants: { include: { inventory: true } }, attributes: true } });
    expect(p.slug).toBe("test-halo-pendant");
    expect(p.variants[0].price).toBe(1_599_000);
    expect(p.variants[0].inventory!.quantity).toBe(4);
    expect(p.minPrice).toBe(1_599_000);
    expect(p.attributes).toHaveLength(1);

    const v = p.variants[0];
    const edited = await saveProductAction({}, productForm(
      { id: p.id, primaryCategoryId: cat.id, name: "Test Halo Pendant II", slug: "test-halo-pendant", status: "ACTIVE" },
      [
        { id: v.id, sku: "TST-PD-001", name: "16 in", size: "16 in", price: "16990", compareAtPrice: "18990", metalValue: "", makingCharges: "", stoneValue: "", grossWeight: "", stock: 7, isActive: true, isDefault: true },
        { sku: "TST-PD-001-18", name: "18 in", size: "18 in", price: "17490", compareAtPrice: "", metalValue: "", makingCharges: "", stoneValue: "", grossWeight: "", stock: 2, isActive: true, isDefault: false },
      ],
    ));
    expect(edited.ok).toBe(true);
    const after = await prisma.product.findUniqueOrThrow({ where: { id: p.id }, include: { variants: { include: { inventory: true } } } });
    expect(after.name).toBe("Test Halo Pendant II");
    expect(after.status).toBe("ACTIVE");
    expect(after.publishedAt).not.toBeNull();
    expect(after.variants).toHaveLength(2);
    expect(after.maxDiscountPct).toBe(10);
    expect(after.variants.find((x) => x.sku === "TST-PD-001")!.inventory!.quantity).toBe(7);
    expect(await prisma.inventoryMovement.count({ where: { variantId: v.id, reason: "ADJUSTMENT", delta: 3, actorId: admin.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: p.id, action: "product.update" } })).toBe(1);
  });

  it("validates product input and rejects duplicate SKUs", async () => {
    await asUser("admin");
    const cat = await prisma.category.findFirstOrThrow({ where: { slug: "pendants" } });
    const dup = await saveProductAction({}, productForm({ primaryCategoryId: cat.id, name: "Another" , sku: "AUR-RG-001" }, [{ sku: "AUR-RG-001-X", name: "Std", size: "", price: "100", compareAtPrice: "", metalValue: "", makingCharges: "", stoneValue: "", grossWeight: "", stock: 1, isActive: true, isDefault: true }]));
    expect(dup.error).toMatch(/SKU is already in use/);
    const invalid = await saveProductAction({}, productForm({ primaryCategoryId: cat.id, name: "X", sku: "TST-BAD" }, [{ sku: "TST-BAD", name: "Std", size: "", price: "-5", compareAtPrice: "", metalValue: "", makingCharges: "", stoneValue: "", grossWeight: "", stock: 1, isActive: true, isDefault: true }]));
    expect(invalid.fieldErrors).toBeTruthy();
    const compare = await saveProductAction({}, productForm({ primaryCategoryId: cat.id, sku: "TST-CMP" }, [{ sku: "TST-CMP", name: "Std", size: "", price: "500", compareAtPrice: "400", metalValue: "", makingCharges: "", stoneValue: "", grossWeight: "", stock: 1, isActive: true, isDefault: true }]));
    expect(compare.error).toMatch(/Compare-at/);
  });

  it("prevents invalid admin order status transitions", async () => {
    await asUser("admin");
    const order = await prisma.order.findFirstOrThrow({ where: { status: "CONFIRMED" } });
    const shipped = await changeStatusAction(order.id, "SHIPPED");
    expect(shipped.error).toMatch(/Cannot change|Add shipment/);
    const delivered = await changeStatusAction(order.id, "DELIVERED");
    expect(delivered.error).toBeTruthy();
    expect((await changeStatusAction(order.id, "PROCESSING")).ok).toBe(true);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PROCESSING");
  });
});
