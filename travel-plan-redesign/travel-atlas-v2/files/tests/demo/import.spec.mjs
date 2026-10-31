import {test,expect} from "@playwright/test";
test("Maps import requires manual confirmation and preserves selected spots",async({page})=>{
 await page.goto("/plan/new?destination=da-lat");
 await page.locator('[aria-label="Chọn điểm ghé"] button').filter({hasText:"Chợ Đà Lạt"}).first().click();
 await page.locator(".atlas-import > summary").click();
 await page.getByLabel("Liên kết Google Maps").fill("https://maps.app.goo.gl/opaque");
 await page.getByRole("button",{name:"Tìm ứng viên"}).click();
 await expect(page.getByText("Chưa xác định được địa điểm",{exact:false})).toBeVisible();
 await expect(page.getByRole("list",{name:"Các điểm đã thêm"}).getByRole("listitem")).toHaveCount(1);
 await page.getByLabel("Tên điểm nhập tay").fill("Điểm riêng");
 await page.getByRole("button",{name:"Thêm điểm nhập tay"}).click();
 await expect(page.getByText("Cần tên địa điểm, vĩ độ",{exact:false})).toBeVisible();
 await page.getByLabel("Vĩ độ",{exact:true}).fill("11.94");
 await page.getByLabel("Kinh độ",{exact:true}).fill("108.44");
 await page.getByRole("button",{name:"Thêm điểm nhập tay"}).click();
 await expect(page.getByRole("list",{name:"Các điểm đã thêm"}).getByRole("listitem")).toHaveCount(2);
});
test("destination switch clears the other city's selection explicitly",async({page})=>{
 await page.goto("/plan/new?destination=da-lat");
 await page.locator('[aria-label="Chọn điểm ghé"] button').filter({hasText:"Chợ Đà Lạt"}).first().click();
 await page.getByLabel("Điểm đến").selectOption("nha-trang");
 await expect(page.getByRole("list",{name:"Các điểm đã thêm"}).getByRole("listitem")).toHaveCount(0);
});
