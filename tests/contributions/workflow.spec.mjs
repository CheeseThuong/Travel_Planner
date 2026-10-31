import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";

const api = process.env.LOCAL_SUPABASE_URL, key = process.env.LOCAL_SUPABASE_PUBLISHABLE_KEY, marker = process.env.LOCAL_AUTH_TEST_MARKER;
async function ownerToken(request) {
  const response = await request.post(`${api}/auth/v1/signup`, { headers: { apikey: key }, data: { data: { test_marker: marker, role: "moderator" } } });
  if (!response.ok()) throw new Error("Disposable browser owner signup failed");
  const data = await response.json(); if (typeof data.access_token !== "string") throw new Error("Disposable browser owner token missing"); return data.access_token;
}
async function authenticate(context, token) { await context.addCookies([{ name: "travel_contributor", value: token, domain: "127.0.0.1", path: "/api/v1/contributions", httpOnly: true, secure: false, sameSite: "Strict" }]); }

test("real owner pin submission, error retry, moderator review/publication/revoke and owner restore", async ({ page, context, browser, request }, testInfo) => {
  const title = `Điểm cộng đồng thử nghiệm ${randomUUID().slice(0, 8)}`;
  const token = await ownerToken(request); await authenticate(context, token);
  const options = { viewport: testInfo.project.use.viewport, reducedMotion: "reduce" };
  const moderator = await browser.newContext(options), visitor = await browser.newContext(options);
  await authenticate(moderator, process.env.LOCAL_CONTRIBUTION_MODERATOR_TOKEN);
  const modPage = await moderator.newPage(), publicPage = await visitor.newPage();
  try {
    await page.route("https://tile.openstreetmap.org/**", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#ddd"/></svg>' }));
    await page.goto("/contribute?destination=da-lat");
    await expect(page.getByText("Phiên đã xác thực", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tải hàng đợi kiểm duyệt" })).toHaveCount(0);
    await page.getByLabel("Liên kết Google Maps").fill("https://maps.app.goo.gl/opaque");
    await page.getByRole("button", { name: "Tìm ứng viên", exact: true }).click();
    await expect(page.getByText("Chưa xác định được địa điểm", { exact: false })).toBeVisible();
    await page.getByLabel("Tên điểm nhập tay").fill(title);
    await page.getByRole("button", { name: "Chọn vị trí trên bản đồ", exact: true }).click();
    await page.getByRole("button", { name: "Xác nhận vị trí", exact: true }).click();
    await page.getByRole("button", { name: "Thêm điểm nhập tay", exact: true }).click();
    await expect(page.getByLabel("Vị trí đóng góp")).toContainText(title);
    await page.getByLabel("Mô tả do bạn tự viết").fill("Mô tả gốc phục vụ kiểm thử, không phải dữ liệu địa điểm thật.");
    await page.getByLabel("Nhóm địa điểm").selectOption("lodging");
    await page.getByLabel("Tôi tự viết nội dung", { exact: false }).check();
    let submits = 0;
    await page.route("**/api/v1/contributions", async route => { if (route.request().method() === "POST" && submits++ === 0) return route.fulfill({ status: 503, contentType: "application/json", body: '{"error":{"message":"Lỗi provider tạm thời; nội dung vẫn được giữ."}}' });
      return route.continue(); });
    await page.getByRole("button", { name: "Gửi đóng góp để kiểm duyệt", exact: true }).click();
    await expect(page.getByRole("region", { name: "Thông báo đóng góp" }).getByRole("alert")).toContainText("nội dung vẫn được giữ");
    await expect(page.getByLabel("Mô tả do bạn tự viết")).toHaveValue("Mô tả gốc phục vụ kiểm thử, không phải dữ liệu địa điểm thật.");
    await expect(page.getByLabel("Tôi tự viết nội dung", { exact: false })).toBeChecked();
    await page.getByRole("button", { name: "Gửi đóng góp để kiểm duyệt", exact: true }).click();
    const mine = page.getByRole("list", { name: "Đóng góp của tôi" }).getByRole("listitem").filter({ hasText: title });
    await expect(mine).toHaveCount(1); await expect(mine).toContainText("chờ kiểm tra trùng");
    await publicPage.goto("http://127.0.0.1:3397/contribute?destination=da-lat");
    await publicPage.getByRole("button", { name: "Xem đóng góp đã duyệt" }).click();
    await expect(publicPage.getByRole("region", { name: "Đóng góp công khai" })).not.toContainText(title);
    await modPage.goto("http://127.0.0.1:3397/contribute?destination=da-lat");
    await modPage.getByRole("button", { name: "Tải hàng đợi kiểm duyệt" }).click();
    const review = modPage.getByRole("list", { name: "Hàng đợi kiểm duyệt" }).getByRole("listitem").filter({ hasText: title });
    await review.getByRole("button", { name: "Bắt đầu kiểm duyệt" }).click();
    await expect(review).toContainText("Đang kiểm duyệt");
    await review.getByLabel(`Ghi chú kiểm duyệt ${title}`).fill("Đã kiểm tra nguồn gốc nội dung thử nghiệm.");
    await review.getByRole("button", { name: "Duyệt đóng góp", exact: true }).click();
    await expect(review).toContainText("Đã duyệt đóng góp cộng đồng");
    await publicPage.getByRole("button", { name: "Xem đóng góp đã duyệt" }).click();
    const publicList = publicPage.getByRole("region", { name: "Đóng góp công khai" });
    await expect(publicList).toContainText(title); await expect(publicList).toContainText("giá và khả năng tiếp cận chưa xác minh");
    await expect(publicList).not.toContainText("Đã kiểm tra nguồn gốc nội dung thử nghiệm.");
    await page.getByRole("button", { name: "Tải đóng góp của tôi" }).click();
    await mine.getByRole("button", { name: "Rút đóng góp" }).click(); await expect(mine).toContainText("Đã rút đóng góp");
    await publicPage.getByRole("button", { name: "Xem đóng góp đã duyệt" }).click(); await expect(publicList).not.toContainText(title);
    await mine.getByRole("button", { name: "Gửi lại để duyệt" }).click(); await expect(mine).toContainText("chờ kiểm tra trùng");
    await modPage.getByRole("button", { name: "Tải hàng đợi kiểm duyệt" }).click();
    await review.getByRole("button", { name: "Từ chối / thu hồi duyệt" }).click(); await expect(review).toContainText("Từ chối");
    await review.getByRole("button", { name: "Khôi phục để duyệt lại" }).click(); await expect(review).toContainText("Đang kiểm duyệt");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const forbidden = await context.request.get("http://127.0.0.1:3397/api/v1/contributions?destination_slug=da-lat&scope=review"); expect(forbidden.status()).toBe(403);
  } finally { await moderator.close(); await visitor.close(); }
});
