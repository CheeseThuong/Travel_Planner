import { test, expect } from "@playwright/test";

test("Maps import requires confirmation, preserves selected places and supports no-key manual entry", async ({ page }) => {
  await page.goto("/plan/new?destination=da-lat");
  await page.getByRole("checkbox", { name: "Chợ Đà Lạt 60 phút", exact: true }).check();
  const selected = page.getByRole("list", { name: "Các điểm đã thêm" });
  await page.getByLabel("Liên kết Google Maps").fill("https://www.google.com/maps?query=Ch%E1%BB%A3");
  await page.getByRole("button", { name: "Tìm ứng viên" }).click();
  await expect(page.getByText("Đây là gợi ý từ catalog độc lập", { exact: false })).toBeVisible();
  await expect(selected.getByRole("listitem")).toHaveCount(1);
  await page.getByRole("button", { name: "Xác nhận Chợ Đà Lạt", exact: true }).click();
  await expect(page.getByText("Điểm này đã được chọn.", { exact: true })).toBeVisible();
  await expect(selected.getByRole("listitem")).toHaveCount(1);
  await page.getByLabel("Liên kết Google Maps").fill("https://maps.app.goo.gl/opaque");
  await page.getByRole("button", { name: "Tìm ứng viên" }).click();
  await expect(page.getByText("Chưa xác định được địa điểm.", { exact: false })).toBeVisible();
  await page.getByLabel("Tên điểm nhập tay").fill("Điểm của tôi");
  await page.getByRole("button", { name: "Thêm điểm nhập tay" }).click();
  await expect(page.getByText("Cần tên địa điểm, vĩ độ", { exact: false })).toBeVisible();
  await page.getByLabel("Vĩ độ", { exact: true }).fill("11.94");
  await page.getByLabel("Kinh độ", { exact: true }).fill("108.44");
  await page.getByRole("button", { name: "Thêm điểm nhập tay" }).click();
  await expect(selected.getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: "Thêm điểm nhập tay" }).click();
  await expect(page.getByText("Điểm này đã được chọn.", { exact: true })).toBeVisible();
  await expect(selected.getByRole("listitem")).toHaveCount(2);
  await page.getByLabel("Liên kết Google Maps").fill("https://localhost/maps");
  await page.getByRole("button", { name: "Tìm ứng viên" }).click();
  await expect(page.getByText("Không thể nhận diện liên kết lúc này.", { exact: false })).toBeVisible();
  await expect(selected.getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: "Bỏ Điểm của tôi", exact: true }).click();
  await expect(selected.getByRole("listitem")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("combobox", { name: "Điểm đến", exact: true }).selectOption("nha-trang");
  await expect(selected.getByRole("listitem")).toHaveCount(0);
  await expect(page.getByLabel("Tên điểm nhập tay")).toHaveValue("");
});

test("catalog confirmation survives filtering and is removable", async ({ page }) => {
  await page.goto("/plan/new?destination=da-lat");
  await page.getByLabel("Tìm trong catalog").fill("không-có-kết-quả");
  await expect(page.getByRole("checkbox", { name: /Vườn hoa thành phố Đà Lạt/ })).toHaveCount(0);
  await page.getByLabel("Liên kết Google Maps").fill("https://www.google.com/maps?query=V%C6%B0%E1%BB%9Dn+hoa+th%C3%A0nh+ph%E1%BB%91");
  await page.getByRole("button", { name: "Tìm ứng viên" }).click();
  const confirm = page.getByRole("button", { name: /^Xác nhận / }).first();
  await expect(confirm).toBeVisible();
  await confirm.click();
  await expect(page.getByRole("list", { name: "Các điểm đã thêm" }).getByRole("listitem")).toHaveCount(1);
  await page.getByRole("button", { name: "Bỏ Vườn hoa thành phố Đà Lạt", exact: true }).click();
  await expect(page.getByRole("list", { name: "Các điểm đã thêm" }).getByRole("listitem")).toHaveCount(0);
});

test("manual import caps selection at thirty and reports the thirty-first without losing data", async ({ page }) => {
  await page.goto("/plan/new");
  await page.getByLabel("Vĩ độ", { exact: true }).fill("12.24");
  await page.getByLabel("Kinh độ", { exact: true }).fill("109.19");
  for (let index = 1; index <= 31; index++) {
    await page.getByLabel("Tên điểm nhập tay").fill(`Điểm ${index}`);
    await page.getByRole("button", { name: "Thêm điểm nhập tay" }).click();
  }
  await expect(page.getByText("Mỗi chuyến đi tối đa 30 điểm.", { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Các điểm đã thêm" }).getByRole("listitem")).toHaveCount(30);
});
