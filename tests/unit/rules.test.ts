import { describe, expect, it } from "vitest";
import { estimateDelivery } from "@/lib/delivery";
import { settingDefaults } from "@/lib/settings-defaults";
import { canTransition, ADMIN_TRANSITIONS } from "@/lib/orders/status";
import { filtersToQuery, parseFilters } from "@/lib/catalog/filters";
import { verifyCheckoutSignature, verifyWebhookSignature } from "@/lib/payments/razorpay";
import { hashPassword, passwordIssue, verifyPassword } from "@/lib/auth/password";
import { createHmac } from "node:crypto";

describe("delivery estimates", () => {
  const now = new Date("2026-10-19T10:00:00+05:30"); // Monday
  it("rejects invalid and unserviceable PIN codes", () => {
    expect(estimateDelivery("12345", settingDefaults.shipping, now).serviceable).toBe(false);
    expect(estimateDelivery("012345", settingDefaults.shipping, now).serviceable).toBe(false);
    expect(estimateDelivery("744101", settingDefaults.shipping, now).serviceable).toBe(false);
  });
  it("is faster for metro PIN codes and skips Sundays", () => {
    const metro = estimateDelivery("560038", settingDefaults.shipping, now);
    const other = estimateDelivery("822101", settingDefaults.shipping, now);
    if (!metro.serviceable || !other.serviceable) throw new Error("expected serviceable");
    expect(metro.standard.to.getTime()).toBeLessThan(other.standard.to.getTime());
    expect(other.standard.to.getDay()).not.toBe(0);
  });
});

describe("order status machine", () => {
  it("allows the normal fulfilment path", () => {
    expect(canTransition("PENDING_PAYMENT", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "PROCESSING")).toBe(true);
    expect(canTransition("PROCESSING", "SHIPPED")).toBe(true);
    expect(canTransition("SHIPPED", "DELIVERED")).toBe(true);
  });
  it("blocks invalid transitions", () => {
    expect(canTransition("DELIVERED", "CANCELLED")).toBe(false);
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
    expect(canTransition("SHIPPED", "CANCELLED")).toBe(false);
    expect(canTransition("PENDING_PAYMENT", "SHIPPED")).toBe(false);
  });
  it("does not let admins mark unpaid orders as confirmed manually", () => {
    expect(ADMIN_TRANSITIONS.PENDING_PAYMENT).not.toContain("CONFIRMED");
  });
});

describe("listing filters", () => {
  it("parses, sanitises and round-trips query params", () => {
    const f = parseFilters({ metal: "YELLOW_GOLD,BOGUS", priceMin: "10000", priceMax: "-5", sort: "price_desc", page: "2", availability: "in-stock" });
    expect(f.metal).toEqual(["YELLOW_GOLD"]);
    expect(f.priceMin).toBe(10000);
    expect(f.priceMax).toBeUndefined();
    expect(f.sort).toBe("price_desc");
    expect(f.inStock).toBe(true);
    expect(filtersToQuery(f)).toBe("?metal=YELLOW_GOLD&priceMin=10000&availability=in-stock&sort=price_desc&page=2");
  });
  it("defaults unknown sort to popularity", () => expect(parseFilters({ sort: "drop table" }).sort).toBe("popular"));
});

describe("Razorpay signatures", () => {
  const secret = "s3cr3t";
  it("verifies checkout signatures", () => {
    const sig = createHmac("sha256", secret).update("order_1|pay_1").digest("hex");
    expect(verifyCheckoutSignature("order_1", "pay_1", sig, secret)).toBe(true);
    expect(verifyCheckoutSignature("order_1", "pay_2", sig, secret)).toBe(false);
    expect(verifyCheckoutSignature("order_1", "pay_1", "short", secret)).toBe(false);
  });
  it("verifies webhook signatures", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true);
    expect(verifyWebhookSignature(body + " ", sig, secret)).toBe(false);
  });
});

describe("passwords", () => {
  it("hashes with a salt and verifies", async () => {
    const h1 = await hashPassword("Gold1234");
    const h2 = await hashPassword("Gold1234");
    expect(h1).not.toBe(h2);
    expect(await verifyPassword("Gold1234", h1)).toBe(true);
    expect(await verifyPassword("gold1234", h1)).toBe(false);
  });
  it("enforces strength rules", () => {
    expect(passwordIssue("short1")).toBeTruthy();
    expect(passwordIssue("onlyletters")).toBeTruthy();
    expect(passwordIssue("Letters123")).toBeNull();
  });
});
