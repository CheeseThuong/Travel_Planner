import { test, expect } from "@playwright/test";

test("known island transfer stays required and explicitly unscheduled in the local preview", async ({ page }) => {
  await page.goto("/plan/new?destination=nha-trang");
  await page.getByLabel("Ngày bắt đầu").fill("2026-11-10");
  await page.getByLabel("Ngày kết thúc").fill("2026-11-11");
  await page.locator('[aria-label="Chọn điểm ghé"] button').filter({ hasText: "Thủy cung Trí Nguyên" }).first().click();
  await page.getByLabel("Bắt buộc Thủy cung Trí Nguyên").check();
  await page.getByRole("button", { name: /XẾP LỊCH TRÌNH/ }).click();
  await expect(page.locator(".atlas-unscheduled").getByRole("listitem")).toContainText(["Thủy cung Trí Nguyên"]);
  await expect(page.locator(".atlas-unscheduled")).toContainText("Cần tự xác minh phương tiện trung chuyển");
  await expect(page.getByLabel("Bắt buộc Thủy cung Trí Nguyên")).toBeChecked();
});

test("browsing preserves the candidate, selected order and required flags; cancelling a city change preserves all", async ({ page }) => {
  await page.goto("/plan/new?destination=da-lat");
  await page.getByLabel("Ngày bắt đầu").fill("2026-11-10");
  await page.getByLabel("Ngày kết thúc").fill("2026-11-11");
  for (const title of ["Chợ Đà Lạt", "Vườn hoa thành phố"]) await page.locator('[aria-label="Chọn điểm ghé"] button').filter({ hasText: title }).first().click();
  await page.getByLabel("Bắt buộc Chợ Đà Lạt").check();
  await page.getByRole("button", { name: /XẾP LỊCH TRÌNH/ }).click();
  const tabs = page.getByRole("tablist", { name: "Ngày trong lịch trình" });
  await expect(tabs).toBeVisible();
  await page.route("**/api/v1/places/search", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":{"code":"PROVIDER_UNAVAILABLE"}}' }));
  await page.locator(".atlas-import > summary").click();
  await page.getByLabel("Tên hoặc địa chỉ cần tìm").fill("Chợ Đà Lạt");
  await page.getByRole("button", { name: "Tìm theo tên", exact: true }).click();
  await expect(page.getByText("Chưa tìm được địa điểm lúc này", { exact: false })).toBeVisible();
  await expect(tabs).toBeVisible();
  await page.getByLabel("Loại trải nghiệm").selectOption("food");
  await expect(page.locator('[aria-label="Chọn điểm ghé"] .atlas-place')).toHaveCount(0);
  await page.getByLabel("Khu vực khám phá").selectOption("outskirts");
  await page.getByLabel("Tìm trong catalog").fill("không khớp");
  const queue = page.getByRole("list", { name: "Các điểm đã thêm" });
  await expect(queue.getByRole("listitem")).toContainText(["Chợ Đà Lạt", "Vườn hoa thành phố"]);
  await expect(page.getByLabel("Bắt buộc Chợ Đà Lạt")).toBeChecked();
  await expect(tabs).toBeVisible();
  page.once("dialog", async dialog => { expect(dialog.message()).toContain("xóa các điểm"); await dialog.dismiss(); });
  await page.getByLabel("Điểm đến").selectOption("nha-trang");
  await expect(page.getByLabel("Điểm đến")).toHaveValue("da-lat");
  await expect(queue.getByRole("listitem")).toHaveCount(2);
  await expect(tabs).toBeVisible();
  await page.getByLabel("Số người").fill("3");
  await expect(tabs).toHaveCount(0);
});

test("destination catalog shares ten categories, zones and accessible source details", async ({ page }) => {
  await page.goto("/destinations/nha-trang");
  await expect(page.getByLabel("Loại trải nghiệm").locator("option")).toHaveCount(11);
  await page.getByLabel("Khu vực khám phá").selectOption("special_transport");
  await expect(page.getByText("Tìm thấy 1 điểm ghé.")).toBeVisible();
  await page.getByRole("button", { name: "Thông tin Thủy cung Trí Nguyên", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("ODbL-1.0");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Loại trải nghiệm").selectOption("lodging");
  await expect(page.getByText("Tìm thấy 0 điểm ghé.")).toBeVisible();
});

test("category and zone details expose uncertainty and mount a fixed map only on request", async ({ page, context }) => {
  const tiles = [];
  await page.route("https://tile.openstreetmap.org/**", route => { tiles.push(route.request().url()); return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#ddd"/></svg>' }); });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/plan/new?destination=nha-trang");
  await expect(page.getByLabel("Loại trải nghiệm").locator("option")).toHaveCount(11);
  await page.getByLabel("Khu vực khám phá").selectOption("special_transport");
  await expect(page.locator('[aria-label="Chọn điểm ghé"] .atlas-place')).toHaveCount(1);
  await page.getByRole("button", { name: "Thông tin Thủy cung Trí Nguyên", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Thủy cung Trí Nguyên" });
  await expect(dialog).toContainText("Cần tự xác minh phương tiện trung chuyển riêng");
  await expect(dialog).toContainText("chưa xác minh");
  await expect(dialog.getByRole("link", { name: "OpenStreetMap", exact: true })).toHaveAttribute("href", /^https:\/\/www.openstreetmap.org\//);
  expect(tiles).toHaveLength(0);
  await dialog.getByRole("button", { name: "Xem vị trí trên bản đồ" }).click();
  await expect.poll(() => tiles.length).toBeGreaterThan(0);
  expect(tiles.length).toBeLessThanOrEqual(9);
  const coordinates = dialog.getByLabel("Tọa độ ghim đã chọn");
  const before = await coordinates.textContent();
  await dialog.getByLabel("Xem bản đồ danh mục").click();
  await expect(coordinates).toHaveText(before);
  await expect(dialog.getByRole("button", { name: "Xác nhận vị trí", exact: true })).toHaveCount(0);
  await context.setOffline(true);
  await expect(dialog).toContainText("Đang ngoại tuyến");
  await dialog.getByRole("button", { name: "Đóng thông tin" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Thông tin Thủy cung Trí Nguyên", exact: true })).toBeFocused();
  await context.setOffline(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
