import { test, expect } from "@playwright/test";
const dates=async(page,start="2026-11-10",end="2026-11-11")=>{
 await page.getByLabel("Ngày bắt đầu").fill(start);
 await page.getByLabel("Ngày kết thúc").fill(end);
};
const choosePlace=async(page,name)=>page.locator('[aria-label="Chọn điểm ghé"] button').filter({hasText:name}).first().click();

test("atlas home and cities render without overflow",async({page})=>{
 for(const route of ["/","/destinations/da-lat","/destinations/nha-trang","/plan/new"]){
  await page.goto(route);
  await expect(page.locator("main")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await expect(page.getByRole("button",{name:/XẾP LỊCH TRÌNH/})).toBeVisible();
});
test("assisted mode generates a timeline and exposes unscheduled points",async({page})=>{
 await page.goto("/plan/new?destination=da-lat");await dates(page);
 await choosePlace(page,"Chợ Đà Lạt");
 await page.getByRole("button",{name:/XẾP LỊCH TRÌNH/}).click();
 await expect(page.locator(".atlas-result-note")).toContainText("Đã lập lịch thử");
 await expect(page.getByRole("tab",{name:/NGÀY 1/})).toBeVisible();
 await expect(page.getByRole("heading",{name:/Điểm chưa xếp được/})).toBeVisible();
 await expect(page.getByRole("button",{name:"TẢI BẢN NHÁP JSON"})).toBeVisible();
});
test("manual mode validates assigned times without overwriting selections",async({page})=>{
 await page.goto("/plan/new?destination=da-lat");await dates(page,"2026-11-10","2026-11-10");
 await choosePlace(page,"Chợ Đà Lạt");
 await page.getByRole("button",{name:/Tôi tự xếp/}).click();
 await page.getByLabel("Ngày Chợ Đà Lạt").selectOption("2026-11-10");
 await page.getByLabel("Giờ Chợ Đà Lạt").fill("11:00");
 await page.getByRole("button",{name:/KIỂM TRA LỊCH CỦA TÔI/}).click();
 await expect(page.getByRole("heading",{name:"Kiểm tra xung đột"})).toBeVisible();
 await expect(page.getByRole("tab",{name:/NGÀY 1/})).toBeVisible();
 await expect(page.getByText("Giờ do bạn đặt")).toBeVisible();
});
test("short Maps URL warns and manual entry works",async({page})=>{
 await page.goto("/plan/new?destination=da-lat");await page.locator(".atlas-import > summary").click();
 await page.getByLabel("Liên kết Google Maps").fill("https://maps.app.goo.gl/testcode");
 await expect(page.getByText("Đây là liên kết rút gọn",{exact:false})).toBeVisible();
 await page.getByLabel("Tên điểm nhập tay").fill("Điểm riêng");
 await page.getByText("Nhập tọa độ nâng cao",{exact:true}).click();
 await page.getByLabel("Vĩ độ",{exact:true}).fill("11.95");await page.getByLabel("Kinh độ",{exact:true}).fill("108.45");
 await page.getByRole("button",{name:"Thêm điểm nhập tay"}).click();
 await expect(page.getByRole("list",{name:"Các điểm đã thêm"}).getByRole("listitem")).toHaveCount(1);
});
test("clean profile has no hydration mismatch and honors reduced motion",async({page})=>{
 const issues=[];page.on("pageerror",e=>{if(/hydration|didn't match/i.test(e.message))issues.push(e.message)});
 page.on("console",m=>{if(/hydration|didn't match/i.test(m.text()))issues.push(m.text())});
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/plan/new");
 await page.getByLabel("Tìm trong catalog").fill("chợ");
 expect(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
 expect(issues).toEqual([]);
});
