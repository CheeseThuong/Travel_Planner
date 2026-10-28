import { test, expect } from "@playwright/test";

test("wizard calculates group budget and preserves manual planning mode", async ({ page }) => {
  await page.goto("/plan/new?destination=da-lat");
  await expect(page.getByLabel("Điểm đến")).toHaveValue("da-lat");
  await page.getByLabel("Ngày bắt đầu").fill("2026-11-10");
  await page.getByLabel("Ngày kết thúc").fill("2026-11-12");
  await page.getByLabel("Tên nơi lưu trú hoặc điểm gốc").fill("Nơi ở của nhóm");
  await page.getByLabel("Vĩ độ điểm gốc").fill("11.94");
  await page.getByLabel("Kinh độ điểm gốc").fill("108.44");
  await page.getByLabel("Số người").fill("4");
  await page.getByLabel("Tổng ngân sách").fill("12000000");
  await page.getByLabel("Chi phí chỗ ở").fill("2000000");
  await page.getByLabel("Chi phí di chuyển").fill("1000000");
  await page.getByLabel("Chợ Đà Lạt").check();
  await page.getByLabel("Thác Datanla").check();
  await page.getByLabel("Tôi tự lên kế hoạch").check();
  await page.getByRole("button", { name: "Xem kết quả chuẩn bị" }).click();

  await expect(page.getByText("Đã kiểm tra thông tin sơ bộ")).toBeVisible();
  await expect(page.getByText("Chưa tạo lịch trình và chưa lưu.", { exact: false })).toBeVisible();
  await expect(page.getByText("Hệ thống sẽ giữ nguyên danh sách để bạn tự xếp lịch.")).toBeVisible();
  await expect(page.getByText(/750\.000/)).toBeVisible();
  await expect(page.getByText("Chi phí tại 2 điểm vẫn chưa biết.")).toBeVisible();
});

test("wizard enforces party-size boundary", async ({ page }) => {
  await page.goto("/plan/new");
  await page.getByLabel("Số người").fill("31");
  expect(await page.getByLabel("Số người").evaluate((input) => input.checkValidity())).toBe(false);
});
