import { test, expect } from "@playwright/test";

// Access codes must never enter traces, screenshots or videos, including on failure.
test.use({ trace: "off", video: "off", screenshot: "off" });
test("clean browser hydrates Studio and vault routes without extension markers or React errors", async ({ page }) => {
  const errors=[]; page.on("pageerror",error=>errors.push(error.message));
  page.on("console",msg=>{if(msg.type()==="error" && /hydrat|server rendered|didn't match/i.test(msg.text()))errors.push(msg.text());});
  for(const path of ["/", "/cam-hung/da-lat", "/plans", "/contribute", "/plan/new?destination=da-lat"]){
    const response=await page.goto(path); expect(response.status()).toBe(200);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator('[bis_skin_checked], [bis_register]')).toHaveCount(0);
  }
  await page.getByLabel("Ngày bắt đầu").fill("2026-11-10");
  expect(errors).toEqual([]);
});
test("saving confirms a real IndexedDB transaction, navigates without reload and hands off the code once", async ({ page }) => {
  await page.goto("/plan/new?destination=da-lat");
  await page.getByLabel("Ngày bắt đầu").fill("2026-11-10"); await page.getByLabel("Ngày kết thúc").fill("2026-11-10");
  await page.getByText("Giờ đến/đi & phương tiện",{exact:true}).click(); await page.getByLabel("Gợi ý thêm điểm phù hợp").uncheck();
  await page.locator('[aria-label="Chọn điểm ghé"] button').filter({hasText:"Chợ Đà Lạt"}).first().click();
  await page.getByRole("button",{name:/XẾP LỊCH TRÌNH/}).click();
  await expect(page.getByRole("tab",{name:/NGÀY 1/})).toBeVisible();
  await page.evaluate(()=>{window.__docNavigationProbe=true;}); page.once("dialog",dialog=>dialog.accept());
  await page.getByRole("button",{name:/XÁC NHẬN & LƯU KẾ HOẠCH/}).click(); await page.waitForURL("**/plans");
  expect(await page.evaluate(()=>window.__docNavigationProbe===true)).toBe(true);
  await expect(page.getByRole("region",{name:"Mã kế hoạch mới"})).toBeVisible();
  expect(await page.evaluate(()=>sessionStorage.getItem("doc-last-created-code")===null)).toBe(true);
  await expect(page.locator(".doc-vault-card")).toHaveCount(1);
  await page.reload(); await expect(page.getByRole("region",{name:"Mã kế hoạch mới"})).toHaveCount(0);
  await expect(page.locator(".doc-vault-card")).toHaveCount(1);
});
test("blocked session storage and IndexedDB show the file fallback without crashing", async ({ page }) => {
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.addInitScript(()=>{
    Object.defineProperty(window,"sessionStorage",{get(){throw new DOMException("Blocked","SecurityError");}});
    Object.defineProperty(window,"indexedDB",{get(){throw new DOMException("Blocked","SecurityError");}});
  });
  await page.goto("/plans"); await expect(page.getByRole("status")).toContainText("IndexedDB");
  await expect(page.getByLabel("Nhập bản sao kế hoạch từ file JSON")).toBeEnabled(); expect(errors).toEqual([]);
});
test("research favorites reload and filtering preserves the user's extra directory entries", async ({ page }) => {
  await page.goto("/cam-hung/da-lat");const cards=page.locator(".doc-explorer-card"), total=await cards.count(); expect(total).toBeGreaterThan(25);
  await cards.first().getByRole("button",{name:"Ghi nhớ ♡",exact:true}).click(); await page.reload();
  await expect(page.getByRole("button",{name:"Đã ghi nhớ ✓",exact:true})).toHaveCount(1);
  await page.getByLabel("Khám phá nơi muốn ghé").fill("no-such-research-place"); await expect(cards).toHaveCount(0);
  await page.getByLabel("Khám phá nơi muốn ghé").fill(""); await expect(cards).toHaveCount(total);
});
test("weather failures remain advisory and configuration diagnostic reports disabled cloud", async ({ page }) => {
  await page.goto("/");await expect(page.getByRole("region",{name:"Thời tiết da-lat"})).toContainText("Chưa có dự báo trực tuyến");
  await page.goto("/contribute");await page.getByRole("button",{name:"Kiểm tra cấu hình máy chủ"}).click();
  await expect(page.getByRole("region",{name:"Chẩn đoán chức năng gửi đóng góp"})).toContainText("Chưa bật trên máy chủ");
});
