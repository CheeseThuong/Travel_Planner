import { test, expect } from "@playwright/test";

test("three local pages render without errors or horizontal overflow", async ({ page }, info) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [path, title, name] of [["/", "Chuyến đi nhỏ.", "landing"], ["/destinations/nha-trang", "Nha Trang", "nha-trang"], ["/destinations/da-lat", "Đà Lạt", "da-lat"]]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `docs/reports/evidence/P01-05-${info.project.name}-${name}.png`, fullPage: true, animations: "disabled" });
  }
  expect(errors).toEqual([]);
});

test("3D is lazy, renders, changes theme, pauses offscreen and disposes on stop", async ({ page }, info) => {
  const errors = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(0);
  const toggle = page.getByRole("button", { name: "Bật 3D", exact: true });
  await expect(toggle).toBeEnabled(); await toggle.click();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveCount(1);
  await expect.poll(async () => Number(await canvas.getAttribute("data-frames"))).toBeGreaterThan(3);
  await page.screenshot({ path: `docs/reports/evidence/P01-05-${info.project.name}-3d.png`, fullPage: true });
  await page.getByRole("button", { name: "Đồi thông", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đồi thông", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(canvas).toHaveCount(1);
  await expect.poll(async () => Number(await canvas.getAttribute("data-frames"))).toBeGreaterThan(3);
  await page.locator("footer").scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const pausedFrames = await canvas.getAttribute("data-frames");
  await page.waitForTimeout(250);
  expect(await canvas.getAttribute("data-frames")).toBe(pausedFrames);
  await page.getByRole("button", { name: "Tắt 3D", exact: true }).click();
  await expect(canvas).toHaveCount(0);
  await page.getByRole("button", { name: "Bật 3D", exact: true }).click();
  await expect(canvas).toHaveCount(1);
  await page.getByTestId("postcard-scene").scrollIntoViewIfNeeded();
  await expect.poll(async () => Number(await canvas.getAttribute("data-frames"))).toBeGreaterThan(1);
  await page.getByRole("link", { name: /Đà Lạt/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Đà Lạt");
  await expect(canvas).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("reduced motion blocks 3D and preference changes stop a running scene", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Bật 3D", exact: true })).toBeDisabled();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByText("Chế độ tĩnh theo cài đặt giảm chuyển động của bạn.")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const start = page.getByRole("button", { name: "Bật 3D", exact: true });
  await expect(start).toBeEnabled(); await start.click();
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Bật 3D", exact: true })).toBeDisabled();
});

test("no WebGL keeps the readable SVG fallback and navigation", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return kind === "webgl2" ? null : original.call(this, kind, ...args); };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Bật 3D", exact: true }).click();
  await expect(page.getByText("Thiết bị chưa mở được 3D. Minh họa tĩnh vẫn sẵn sàng.")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByTestId("postcard-scene").locator("svg")).toHaveCount(1);
  await page.getByRole("link", { name: /Nha Trang/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nha Trang");
});

test("without JavaScript core text and links remain usable", async ({ browser }, info) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: info.project.use.viewport });
  try {
    const page = await context.newPage(); await page.goto("http://127.0.0.1:3391/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Chuyến đi nhỏ.");
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.getByRole("link", { name: /Đà Lạt/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Đà Lạt");
  } finally { await context.close(); }
});

test("keyboard can reach and activate the optional demo control", async ({ page }) => {
  await page.goto("/");
  const control = page.getByRole("button", { name: "Bật 3D", exact: true });
  await control.focus(); await expect(control).toBeFocused(); await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Tắt 3D", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Enter"); await expect(page.locator("canvas")).toHaveCount(0);
});
