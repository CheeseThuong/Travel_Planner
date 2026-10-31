import { test, expect } from "@playwright/test";

const tileFixture = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e8eee9"/><path d="M0 128H256M128 0V256" stroke="#b4c7be"/></svg>';
async function openImport(page) { await page.goto("/plan/new?destination=da-lat"); await page.locator(".atlas-import > summary").click(); }
test("map loads visible tiles only on demand, has attribution/referrer and adds a user-confirmed pin", async ({ page }) => {
  const requests = [];
  await page.route("https://tile.openstreetmap.org/**", async route => { requests.push(route.request()); await route.fulfill({ contentType: "image/svg+xml", headers: { "cache-control": "public, max-age=604800" }, body: tileFixture }); });
  await openImport(page);
  await expect(page.getByRole("button", { name: "Chọn vị trí trên bản đồ", exact: true })).toBeVisible();
  expect(requests).toHaveLength(0);
  await page.getByLabel("Tên điểm nhập tay").fill("Điểm riêng không gửi tới bản đồ");
  await page.getByRole("button", { name: "Chọn vị trí trên bản đồ", exact: true }).click();
  await expect.poll(() => requests.length).toBeGreaterThan(0);
  expect(requests.length).toBeLessThanOrEqual(9);
  expect(requests.every(request => /^https:\/\/tile\.openstreetmap\.org\/14\/\d+\/\d+\.png$/.test(request.url()))).toBe(true);
  expect(requests.every(request => request.headers().referer === `${new URL(page.url()).origin}/`)).toBe(true);
  await expect(page.getByRole("link", { name: "OpenStreetMap contributors", exact: true })).toBeVisible();
  const surface = page.getByRole("button", { name: "Đặt ghim trên bản đồ", exact: true });
  await surface.click({ position: { x: 100, y: 120 } });
  await page.getByRole("button", { name: "Xác nhận vị trí", exact: true }).click();
  const latitude = await page.getByLabel("Vĩ độ", { exact: true }).inputValue(), longitude = await page.getByLabel("Kinh độ", { exact: true }).inputValue();
  expect(Number(latitude)).toBeGreaterThan(11); expect(Number(longitude)).toBeGreaterThan(108);
  await page.getByRole("button", { name: "Đóng bản đồ chọn ghim", exact: true }).click();
  await page.getByRole("button", { name: "Chọn vị trí trên bản đồ", exact: true }).click();
  await expect(page.getByLabel("Tọa độ ghim đã chọn")).toContainText(`${latitude}, ${longitude}`);
  await page.getByRole("button", { name: "Thêm điểm nhập tay", exact: true }).click();
  await expect(page.getByRole("list", { name: "Các điểm đã thêm" }).getByRole("listitem")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
test("keyboard map placement and tile/offline failures preserve the pin and input", async ({ page, context }) => {
  await page.route("https://tile.openstreetmap.org/**", route => route.abort());
  await openImport(page);
  await page.getByLabel("Tên điểm nhập tay").fill("Điểm nhập bằng bàn phím");
  await page.getByRole("button", { name: "Chọn vị trí trên bản đồ", exact: true }).click();
  await expect(page.getByText("Không tải được nền bản đồ", { exact: false })).toBeVisible();
  const surface = page.getByRole("button", { name: "Đặt ghim trên bản đồ", exact: true });
  await surface.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Xác nhận vị trí", exact: true }).click();
  const pin = await page.getByLabel("Kinh độ", { exact: true }).inputValue();
  expect(Number(pin)).toBeGreaterThan(108.4583);
  await context.setOffline(true);
  await expect(page.getByText("Đang ngoại tuyến, nền bản đồ tạm dừng", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Tên điểm nhập tay")).toHaveValue("Điểm nhập bằng bàn phím");
  await expect(page.getByLabel("Kinh độ", { exact: true })).toHaveValue(pin);
  await page.getByText("Nhập tọa độ nâng cao", { exact: true }).click();
  await page.getByRole("button", { name: "Thêm điểm nhập tay", exact: true }).click();
  await expect(page.getByRole("list", { name: "Các điểm đã thêm" }).getByRole("listitem")).toHaveCount(1);
  await context.setOffline(false);
});
