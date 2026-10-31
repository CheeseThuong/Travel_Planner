import {test,expect} from "@playwright/test";
test("Maps import failed request can be retried without losing a selected place",async({page})=>{
 let calls=0;await page.route("**/api/v1/places/resolve",async(route)=>{
  calls++;if(calls===1)return route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:{code:"PROVIDER_UNAVAILABLE"}})});
  return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({data:{status:"manual_entry_required",candidates:[],manual_entry_available:true}})});
 });
 await page.goto("/plan/new?destination=da-lat");
 await page.locator('[aria-label="Chọn điểm ghé"] button').filter({hasText:"Chợ Đà Lạt"}).first().click();
 await page.locator(".atlas-import > summary").click();
 await page.getByLabel("Liên kết Google Maps").fill("https://maps.app.goo.gl/opaque");
 await page.getByRole("button",{name:"Tìm ứng viên"}).click();
 await expect(page.getByText("Không thể nhận diện liên kết lúc này",{exact:false})).toBeVisible();
 await page.getByRole("button",{name:"Tìm ứng viên"}).click();
 await expect(page.getByText("Chưa xác định được địa điểm",{exact:false})).toBeVisible();
 expect(calls).toBe(2);
 await expect(page.getByRole("list",{name:"Các điểm đã thêm"}).getByRole("listitem")).toHaveCount(1);
});
test("offline and reduced-motion keep selection and local planning available",async({page,context})=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/plan/new?destination=da-lat");
 await context.setOffline(true);
 await expect(page.getByText("Bạn đang ngoại tuyến.",{exact:false})).toBeVisible();
 await page.locator('[aria-label="Chọn điểm ghé"] button').filter({hasText:"Chợ Đà Lạt"}).first().click();
 await page.getByLabel("Ngày bắt đầu").fill("2026-11-10");await page.getByLabel("Ngày kết thúc").fill("2026-11-11");
 await page.getByRole("button",{name:/XẾP LỊCH TRÌNH/}).click();
 await expect(page.getByRole("tab",{name:/NGÀY 1/})).toBeVisible();
 await expect(page.locator("canvas")).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await context.setOffline(false);
});
