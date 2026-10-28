import { test, expect } from "@playwright/test";

test("pending/error/retry import states preserve user inputs and selection", async ({ page }) => {
  let release;
  const waiting = new Promise((resolve) => { release = resolve; });
  let calls = 0;
  await page.route("**/api/v1/places/resolve", async (route) => {
    calls++;
    if (calls === 1) { await waiting; await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "PROVIDER_UNAVAILABLE" } }) }); }
    else await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { status: "manual_entry_required", candidates: [], manual_entry_available: true } }) });
  });
  await page.goto("/plan/new?destination=da-lat");
  await page.getByRole("checkbox", { name: "Chợ Đà Lạt 60 phút", exact: true }).check();
  await page.getByLabel("Tên điểm nhập tay").fill("Đang ghi dở");
  await page.getByLabel("Liên kết Google Maps").fill("https://maps.app.goo.gl/opaque");
  await page.getByRole("button", { name: "Tìm ứng viên" }).click();
  await expect(page.getByRole("button", { name: "Đang kiểm tra liên kết…" })).toBeDisabled();
  await expect(page.getByText("Đang tìm trong catalog…", { exact: true })).toBeVisible();
  release();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Không thể nhận diện liên kết");
  await expect(page.getByLabel("Tên điểm nhập tay")).toHaveValue("Đang ghi dở");
  await expect(page.getByRole("list", { name: "Các điểm đã thêm" }).getByRole("listitem")).toHaveCount(1);
  await page.getByRole("button", { name: "Tìm ứng viên" }).click();
  await expect(page.getByText("Chưa xác định được địa điểm.", { exact: false })).toBeVisible();
  expect(calls).toBe(2);
});

test("offline/reconnect, empty results, keyboard and reduced motion keep local selection usable", async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/plan/new?destination=da-lat");
  await expect(page.getByText("Chưa chọn điểm ghé.", { exact: false })).toBeVisible();
  await page.getByRole("checkbox", { name: "Chợ Đà Lạt 60 phút", exact: true }).check();
  await page.getByLabel("Tìm trong catalog").fill("không-có-kết-quả");
  await expect(page.getByText("Không có điểm phù hợp.", { exact: false })).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByText("Bạn đang ngoại tuyến.", { exact: false })).toBeVisible();
  await page.getByLabel("Liên kết Google Maps").fill("https://maps.app.goo.gl/opaque");
  await expect(page.getByRole("button", { name: "Tìm ứng viên" })).toBeDisabled();
  await page.getByLabel("Tên điểm nhập tay").fill("Điểm offline");
  await page.getByLabel("Tên điểm nhập tay").press("Tab");
  await expect(page.getByLabel("Vĩ độ", { exact: true })).toBeFocused();
  await page.getByLabel("Vĩ độ", { exact: true }).fill("11.94");
  await page.getByLabel("Kinh độ", { exact: true }).fill("108.44");
  await page.getByRole("button", { name: "Thêm điểm nhập tay" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("list", { name: "Các điểm đã thêm" }).getByRole("listitem")).toHaveCount(2);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
  expect(await page.locator("canvas").count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.setOffline(false);
  await expect(page.getByText("Bạn đang ngoại tuyến.", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Các điểm đã thêm" }).getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Tìm ứng viên" })).toBeEnabled();
});
