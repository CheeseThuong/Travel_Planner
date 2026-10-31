import {test,expect} from "@playwright/test";
test("catalog keeps cities separate and filters deterministically",async({page})=>{
 await page.goto("/destinations/nha-trang");
 await expect(page.getByText("Tìm thấy 30 điểm ghé.")).toBeVisible();
 await page.getByLabel("Tìm địa điểm").fill("hon chong");
 await expect(page.getByRole("heading",{name:"Hòn Chồng",exact:true})).toBeVisible();
 await expect(page.getByText("Tìm thấy 2 điểm ghé.")).toBeVisible();
 await page.getByLabel("Tìm địa điểm").fill("khong-hien-huu");
 await expect(page.getByText("Không thấy điểm này trong sổ.")).toBeVisible();
 await page.goto("/destinations/da-lat");
 await expect(page.getByRole("heading",{name:"Chợ Đà Lạt"})).toBeVisible();
 await expect(page.getByRole("link",{name:/CHỌN ĐIỂM CHO LỊCH TRÌNH/})).toHaveAttribute("href","/plan/new?destination=da-lat");
});
