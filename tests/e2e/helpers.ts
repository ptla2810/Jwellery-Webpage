import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";

export function adminCreds(): { email: string; password: string } {
  return JSON.parse(readFileSync("tests/e2e/.auth/creds.json", "utf8"));
}

/** Navigates and waits until React has hydrated, so clicks aren't lost. ("networkidle" is unreliable with tracing on.) */
export async function gotoReady(page: Page, url: string) {
  await page.goto(url);
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
}

/** Fills and submits the sign-in form; pass `expectSuccess: false` when the attempt should be rejected. */
export async function login(page: Page, email: string, password: string, next = "/account", expectSuccess = true) {
  await gotoReady(page, `/login?next=${encodeURIComponent(next)}`);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  if (expectSuccess) await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

export function rupees(text: string | null) {
  return Number((text ?? "").replace(/[^\d]/g, ""));
}

export async function addToBag(page: Page, slug: string, sizeIndex?: number) {
  await gotoReady(page, `/products/${slug}`);
  if (sizeIndex != null) await page.getByTestId("variant-option").nth(sizeIndex).click();
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toBeVisible();
}
