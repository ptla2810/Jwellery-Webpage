import { expect, test } from "@playwright/test";
import { addToBag, adminCreds, gotoReady, login, rupees } from "./helpers";

test("guest checkout with cash on delivery creates a confirmed order", async ({ page }) => {
  await addToBag(page, "mira-diamond-studs");
  await gotoReady(page, "/checkout");
  await page.getByTestId("checkout-continue").click();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();
  await page.getByLabel("Full name").fill("Priya Sharma");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("priya@example.com");
  await page.getByLabel("Mobile number").fill("9812345678");
  await page.getByTestId("checkout-continue").click();

  await page.getByLabel("Recipient name").fill("Priya Sharma");
  await page.getByLabel("Recipient mobile").fill("9812345678");
  await page.getByLabel("Flat / house no., building, street").fill("44 Linking Road, Bandra West");
  await page.getByLabel("City").fill("Mumbai");
  await page.getByLabel("State").selectOption("Maharashtra");
  await page.getByLabel("PIN code").fill("744101");
  await page.getByTestId("checkout-continue").click();
  await expect(page.getByText(/do not deliver to this PIN code/)).toBeVisible();
  await page.getByLabel("PIN code").fill("400050");
  await page.getByTestId("checkout-continue").click();

  await expect(page.getByRole("heading", { name: "Delivery option" })).toBeVisible();
  await page.getByTestId("checkout-continue").click();
  await expect(page.getByRole("heading", { name: "Review your order" })).toBeVisible();
  await page.getByTestId("checkout-continue").click();
  await page.getByTestId("pay-cod").click();
  const total = rupees(await page.getByTestId("summary-total").textContent());
  await page.getByTestId("place-order").click();

  await expect(page.getByTestId("order-confirmation")).toBeVisible();
  await expect(page.getByTestId("order-status")).toHaveText("Confirmed");
  await expect(page.getByTestId("order-detail")).toContainText(String(total.toLocaleString("en-IN")));
  const orderNumber = await page.getByTestId("order-number").textContent();
  expect(orderNumber).toMatch(/^AUR\d+/);
  await expect(page.getByTestId("cart-count")).toHaveCount(0);

  // order tracking for guests
  await page.context().clearCookies();
  await gotoReady(page, `/track-order?order=${orderNumber}`);
  await page.getByLabel("Email used for the order").fill("priya@example.com");
  await page.getByRole("button", { name: "Track order" }).click();
  await expect(page.getByTestId("order-number")).toHaveText(orderNumber!);
});

test("customers can register, see their account, and are blocked from admin", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
  const email = `cust${Date.now()}@example.com`;
  await gotoReady(page, "/register");
  await page.getByLabel("Full name").fill("Meera Iyer");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/at least 8 characters/).first()).toBeVisible();
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("Jewels2026");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByRole("heading", { name: "Hello, Meera" })).toBeVisible();

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/forbidden/);

  await page.goto("/account");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
  await login(page, email, "wrongpass1", "/account", false);
  await expect(page.getByText("Incorrect email or password")).toBeVisible();
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("Jewels2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account/);
});

test("guest bag is merged into the account after sign-in", async ({ page }) => {
  await addToBag(page, "chandra-disc-pendant");
  const { email, password } = adminCreds();
  await login(page, email, password, "/cart");
  await expect(page.getByTestId("cart-line").filter({ hasText: "Chandra Disc Pendant" })).toBeVisible();
});

test("admin can edit a product price and it appears on the storefront", async ({ page }) => {
  const { email, password } = adminCreds();
  await login(page, email, password, "/admin/products?q=AUR-AK-002");
  await page.getByRole("link", { name: "Minimal Gold Anklet" }).click();
  await page.getByTestId("variant-price").first().fill("15500");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText("Product saved").first()).toBeVisible();
  await page.goto("/products/minimal-gold-anklet");
  await expect(page.locator("main").getByText("₹15,500").first()).toBeVisible();
});

test("admin sees orders and can move one through fulfilment", async ({ page }) => {
  const { email, password } = adminCreds();
  await login(page, email, password, "/admin/orders?status=CONFIRMED");
  await page.locator("table a").first().click();
  await page.getByRole("button", { name: "Mark being prepared" }).click();
  await expect(page.getByRole("button", { name: "Mark shipped" })).toBeVisible();
  await page.getByRole("button", { name: "Mark shipped" }).click();
  await expect(page.getByText("Add shipment details before marking the order as shipped")).toBeVisible();
  await page.getByLabel("Carrier").fill("Test Courier");
  await page.getByLabel("Tracking number").fill("TC123456");
  await page.getByRole("button", { name: "Add shipment" }).click();
  await expect(page.getByText("Test Courier").first()).toBeVisible();
  await page.getByRole("button", { name: "Mark shipped" }).click();
  await expect(page.getByRole("button", { name: "Mark delivered" })).toBeVisible();
});
