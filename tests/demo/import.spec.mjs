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
 await page.getByText("Nhập tọa độ nâng cao",{exact:true}).click();
 await page.getByLabel("Vĩ độ",{exact:true}).fill("11.94");
 await page.getByLabel("Kinh độ",{exact:true}).fill("108.44");
 await page.getByRole("button",{name:"Thêm điểm nhập tay"}).click();
 await expect(page.getByRole("list",{name:"Các điểm đã thêm"}).getByRole("listitem")).toHaveCount(2);
});
test("destination switch clears the other city's selection explicitly",async({page})=>{
 await page.goto("/plan/new?destination=da-lat");
 await page.locator('[aria-label="Chọn điểm ghé"] button').filter({hasText:"Chợ Đà Lạt"}).first().click();
 page.once("dialog",dialog=>dialog.accept());
 await page.getByLabel("Điểm đến").selectOption("nha-trang");
 await expect(page.getByRole("list",{name:"Các điểm đã thêm"}).getByRole("listitem")).toHaveCount(0);
});

test("opaque Maps links have independent name search and confirmation without coordinate typing",async({page})=>{
 await page.goto("/plan/new?destination=da-lat");
 await page.locator('[aria-label="Chọn điểm ghé"] button').filter({hasText:"Vườn hoa thành phố"}).first().click();
 await page.locator(".atlas-import > summary").click();
 await page.getByLabel("Liên kết Google Maps").fill("https://maps.app.goo.gl/opaque");
 await page.getByRole("button",{name:"Tìm ứng viên",exact:true}).click();
 await expect(page.getByText("Chưa xác định được địa điểm",{exact:false})).toBeVisible();
 await page.getByLabel("Tên hoặc địa chỉ cần tìm").fill("cho da lat");
 await page.getByRole("button",{name:"Tìm theo tên",exact:true}).click();
 await page.getByRole("button",{name:"Xác nhận Chợ Đà Lạt",exact:true}).click();
 await expect(page.getByRole("list",{name:"Các điểm đã thêm"}).getByRole("listitem")).toHaveCount(2);
 await expect(page.getByLabel("Vĩ độ",{exact:true})).toHaveValue("");
 await expect(page.getByLabel("Kinh độ",{exact:true})).toHaveValue("");
});

test("independent name search failure preserves the query and selected places",async({page})=>{
 let calls=0;await page.route("**/api/v1/places/search",async route=>{calls++;if(calls===1)return route.fulfill({status:503,contentType:"application/json",body:'{"error":{"code":"PROVIDER_UNAVAILABLE"}}'});return route.continue();});
 await page.goto("/plan/new?destination=da-lat");
 await page.locator('[aria-label="Chọn điểm ghé"] button').filter({hasText:"Vườn hoa thành phố"}).first().click();
 await page.locator(".atlas-import > summary").click();
 await page.getByLabel("Tên hoặc địa chỉ cần tìm").fill("Chợ Đà Lạt");
 await page.getByRole("button",{name:"Tìm theo tên",exact:true}).click();
 await expect(page.getByText("Chưa tìm được địa điểm lúc này",{exact:false})).toBeVisible();
 await expect(page.getByLabel("Tên hoặc địa chỉ cần tìm")).toHaveValue("Chợ Đà Lạt");
 await expect(page.getByRole("list",{name:"Các điểm đã thêm"}).getByRole("listitem")).toHaveCount(1);
 await page.getByRole("button",{name:"Tìm theo tên",exact:true}).click();
 await expect(page.getByRole("button",{name:"Xác nhận Chợ Đà Lạt",exact:true})).toBeVisible();
});
