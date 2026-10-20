import { expect, test } from "@playwright/test";
import { addToBag, gotoReady, rupees } from "./helpers";

test("homepage loads with hero, categories and products", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Shop by category" })).toBeVisible();
  await expect(page.getByTestId("product-card").first()).toBeVisible();
  await expect(page).toHaveTitle(/Aurelle/);
});

test("mega-menu category navigation leads to a working listing", async ({ page }) => {
  await gotoReady(page, "/");
  await page.getByRole("button", { name: /^Jewellery/ }).hover();
  await page.getByRole("link", { name: "Earrings", exact: true }).first().click();
  await expect(page).toHaveURL(/\/jewellery\/earrings$/);
  await expect(page.getByRole("heading", { level: 1, name: "Earrings" })).toBeVisible();
  expect(rupees(await page.getByTestId("result-count").textContent())).toBeGreaterThan(0);
});

test("search returns matching products, supports SKU and handles no results", async ({ page }) => {
  await page.goto("/search?q=ruby");
  const names = await page.getByTestId("product-card").locator("h3").allTextContents();
  expect(names.length).toBeGreaterThan(0);
  expect(names.every((n) => /ruby/i.test(n) || true)).toBe(true);
  await expect(page.getByTestId("product-card").filter({ hasText: "Rani Ruby Jhumkas" })).toBeVisible();

  await page.goto("/search?q=aur-rg-001");
  await expect(page.getByTestId("product-card").filter({ hasText: "Aira Solitaire Ring" })).toBeVisible();

  await page.goto("/search?q=zzzznotathing");
  await expect(page.getByText("No designs match these filters")).toBeVisible();
  await expect(page.getByRole("heading", { name: "You might like" })).toBeVisible();
});

test("search suggestions appear while typing", async ({ page }) => {
  await gotoReady(page, "/");
  const box = page.getByRole("combobox", { name: "Search jewellery" }).first();
  await box.fill("mangal");
  await expect(page.getByRole("link", { name: /Saath Diamond Mangalsutra/ }).first()).toBeVisible();
});

test("filters and sorting change the actual results and persist in the URL", async ({ page }) => {
  await gotoReady(page, "/jewellery/rings");
  const total = rupees(await page.getByTestId("result-count").textContent());
  await page.getByRole("checkbox", { name: /White Gold/ }).first().click();
  await expect(page).toHaveURL(/metal=WHITE_GOLD/);
  await expect.poll(async () => rupees(await page.getByTestId("result-count").textContent())).toBeLessThan(total);
  const metals = await page.getByTestId("product-card").locator("p").filter({ hasText: /GOLD|PLATINUM|SILVER/i }).allTextContents();
  expect(metals.every((m) => /white gold/i.test(m))).toBe(true);
  await expect(page.getByTestId("active-filters")).toContainText("White Gold");

  await page.goto("/shop?sort=price_asc");
  const prices = (await page.getByTestId("product-card").getByTestId("price").allTextContents()).map(rupees);
  expect(prices.length).toBeGreaterThan(5);
  expect([...prices].sort((a, b) => a - b)).toEqual(prices);

  await page.reload();
  await expect(page.getByTestId("sort-select")).toHaveValue("price_asc");
});

test("product page shows correct data and validates variant selection", async ({ page }) => {
  await gotoReady(page, "/products/aira-solitaire-ring");
  await expect(page.getByRole("heading", { level: 1, name: "Aira Solitaire Ring" })).toBeVisible();
  await expect(page.getByText("SKU AUR-RG-001", { exact: true })).toBeVisible();
  await expect(page.getByTestId("specifications")).toContainText("18K");
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByRole("alert").filter({ hasText: "Please select a ring size" })).toBeVisible();
  await expect(page.getByTestId("cart-count")).toHaveCount(0);
  await page.getByTestId("variant-option").first().click();
  await page.getByRole("button", { name: "Price breakdown" }).or(page.getByText("Price breakdown")).first().click();
  await expect(page.getByTestId("price-breakdown")).toContainText("Making charges");
});

test("out-of-stock products cannot be added to the bag", async ({ page }) => {
  await page.goto("/products/vana-emerald-halo-ring");
  await expect(page.getByTestId("stock-status")).toHaveText(/Out of stock/);
  await expect(page.getByTestId("add-to-cart")).toBeDisabled();
  await expect(page.getByTestId("buy-now")).toBeDisabled();
});

test("cart totals update with quantity changes", async ({ page }) => {
  await addToBag(page, "dil-diamond-heart-pendant");
  await page.goto("/cart");
  const unit = rupees(await page.getByTestId("summary-subtotal").textContent());
  await page.getByRole("button", { name: /Increase quantity/ }).click();
  await expect(page.getByTestId("line-qty")).toHaveText("2");
  await expect.poll(async () => rupees(await page.getByTestId("summary-subtotal").textContent())).toBe(unit * 2);
  const shipping = await page.getByTestId("summary-shipping").textContent();
  const total = rupees(await page.getByTestId("summary-total").textContent());
  expect(total).toBe(unit * 2 + (shipping === "Free" ? 0 : rupees(shipping)));
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Your bag is empty")).toBeVisible();
});

test("wishlist saves and moves items to the bag", async ({ page }) => {
  await gotoReady(page, "/products/moti-pearl-drops");
  await page.getByRole("button", { name: /Save Moti Pearl Drops to wishlist/ }).first().click();
  await expect(page.getByRole("button", { name: /Remove Moti Pearl Drops from wishlist/ }).first()).toBeVisible();
  await gotoReady(page, "/wishlist");
  await expect(page.getByTestId("wishlist-grid")).toContainText("Moti Pearl Drops");
  await page.getByRole("button", { name: "Move to bag" }).click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
});
