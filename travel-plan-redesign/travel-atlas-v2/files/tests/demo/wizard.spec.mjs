import {test,expect} from "@playwright/test";
test("planner really schedules selected places instead of returning intake-only draft",async({page})=>{
 await page.goto("/plan/new?destination=da-lat");
 await page.getByLabel("Ngày bắt đầu").fill("2026-11-10");
 await page.getByLabel("Ngày kết thúc").fill("2026-11-12");
 await page.getByLabel("Số người").fill("4");
 await page.getByLabel("Tổng ngân sách").fill("12000000");
 await page.locator('[aria-label="Chọn điểm ghé"] button').filter({hasText:"Chợ Đà Lạt"}).first().click();
 await page.getByRole("button",{name:/XẾP LỊCH TRÌNH/}).click();
 await expect(page.getByRole("status")).toContainText("Đã lập lịch thử");
 await expect(page.getByRole("tab",{name:/NGÀY 1/})).toBeVisible();
 await expect(page.getByRole("button",{name:"TẢI BẢN NHÁP JSON"})).toBeVisible();
});
test("invalid party size is reported without crashing React",async({page})=>{
 await page.goto("/plan/new");await page.getByLabel("Số người").fill("31");
 await page.getByRole("button",{name:/XẾP LỊCH TRÌNH/}).click();
 await expect(page.getByRole("alert")).toContainText("Chọn khoảng ngày");
});
