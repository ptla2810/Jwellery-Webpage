import { expect, test } from "@playwright/test";
import { gotoReady } from "./helpers";

for (const path of ["/", "/jewellery/rings", "/products/rani-ruby-jhumkas", "/cart", "/checkout", "/login"]) {
  test(`no horizontal overflow on ${path}`, async ({ page }) => {
    await gotoReady(page, path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("mobile navigation, filter drawer and add to bag work", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile-only");
  await gotoReady(page, "/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const dialog = page.getByRole("dialog", { name: "Menu" });
  await dialog.getByText("Jewellery", { exact: true }).click();
  await dialog.getByRole("link", { name: "Bangles" }).click();
  await expect(page).toHaveURL(/\/jewellery\/bangles/);
  await page.getByTestId("mobile-filter-button").click();
  const filters = page.getByRole("dialog", { name: "Filters" });
  await filters.getByRole("checkbox", { name: /In stock only/ }).click();
  await expect(page).toHaveURL(/availability=in-stock/);
  await filters.getByRole("button", { name: /Show \d+ results/ }).click();
  await gotoReady(page, "/products/phool-diamond-nose-pin");
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
});
