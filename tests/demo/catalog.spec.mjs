import { test, expect } from "@playwright/test";

test("catalog keeps destinations separate and supports search, filter and pagination", async ({ page }) => {
  await page.goto("/destinations/nha-trang");
  await expect(page.getByText("Tìm thấy 30 điểm ghé.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chợ Đà Lạt" })).toHaveCount(0);
  await page.getByLabel("Tìm địa điểm").fill("hon chong");
  await expect(page.getByRole("heading", { name: "Hòn Chồng", exact: true })).toBeVisible();
  await expect(page.getByText("Tìm thấy 2 điểm ghé.")).toBeVisible();

  await page.getByLabel("Tìm địa điểm").fill("");
  await page.getByLabel("Loại trải nghiệm").selectOption("beach");
  await expect(page.getByText(/Tìm thấy \d+ điểm ghé\./)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chợ Đà Lạt" })).toHaveCount(0);
  await page.getByLabel("Tìm địa điểm").fill("không-có-địa-điểm-này");
  await expect(page.getByRole("heading", { name: "Chưa tìm thấy điểm phù hợp" })).toBeVisible();

  await page.goto("/destinations/da-lat");
  await expect(page.getByRole("heading", { name: "Chợ Đà Lạt" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lập kế hoạch với các điểm đã chọn" })).toHaveAttribute("href", "/plan/new?destination=da-lat");
  await expect(page.getByRole("button", { name: "Sau" })).toBeEnabled();
});
