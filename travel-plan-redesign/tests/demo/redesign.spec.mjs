import { test, expect } from "@playwright/test";

test("travel journal pages retain functional entry points without overflow", async ({ page }) => {
  for (const route of ["/", "/destinations/nha-trang", "/destinations/da-lat", "/plan/new"]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect(page.getByRole("button", { name: "Xem kết quả chuẩn bị" })).toBeVisible();
});

test("clean browser does not emit hydration mismatch", async ({ page }) => {
  const hydrationErrors = [];
  page.on("console", (msg) => { if (/hydration|hydrated|didn't match the client/i.test(msg.text())) hydrationErrors.push(msg.text()); });
  page.on("pageerror", (err) => { if (/hydration|hydrated/i.test(err.message)) hydrationErrors.push(err.message); });
  await page.goto("/plan/new?destination=da-lat");
  await page.getByLabel("Tìm trong catalog").fill("hoa");
  await expect(page.getByRole("main")).toBeVisible();
  expect(hydrationErrors).toEqual([]);
});
