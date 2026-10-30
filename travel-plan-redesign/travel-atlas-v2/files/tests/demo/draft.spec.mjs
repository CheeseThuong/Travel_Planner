import {test,expect} from "@playwright/test";
test("partial-day schedule remains visible and input changes invalidate preview",async({page})=>{
 await page.goto("/plan/new?destination=da-lat");
 await page.getByLabel("Ngày bắt đầu").fill("2026-11-10");
 await page.getByLabel("Ngày kết thúc").fill("2026-11-10");
 await page.getByLabel("Giờ đến").fill("17:00");
 await page.getByLabel("Giờ rời đi").fill("19:00");
 await page.locator('[aria-label="Chọn điểm ghé"] button').filter({hasText:"Chợ Đà Lạt"}).first().click();
 await page.getByRole("button",{name:/XẾP LỊCH TRÌNH/}).click();
 await expect(page.getByRole("tab",{name:/NGÀY 1/})).toBeVisible();
 await page.getByLabel("Giờ đến").fill("20:00");
 await expect(page.getByRole("tab",{name:/NGÀY 1/})).toHaveCount(0);
 await page.getByRole("button",{name:/XẾP LỊCH TRÌNH/}).click();
 await expect(page.getByRole("alert")).toContainText("Kiểm tra giờ đến");
});
test("manual mode does not silently schedule unassigned stops",async({page})=>{
 await page.goto("/plan/new?destination=da-lat");
 await page.getByLabel("Ngày bắt đầu").fill("2026-11-10");
 await page.getByLabel("Ngày kết thúc").fill("2026-11-11");
 await page.locator('[aria-label="Chọn điểm ghé"] button').filter({hasText:"Chợ Đà Lạt"}).first().click();
 await page.getByRole("button",{name:/Tôi tự xếp/}).click();
 await page.getByRole("button",{name:/KIỂM TRA LỊCH CỦA TÔI/}).click();
 await expect(page.getByRole("alert")).toContainText("gán ngày và giờ bắt đầu");
});
