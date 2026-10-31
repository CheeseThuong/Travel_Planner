import {test,expect} from "@playwright/test";
test("atlas landing and two cities are accessible without decorative WebGL",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 for(const [url,heading] of [["/","Đi đâu,"],["/destinations/nha-trang","Nha Trang"],["/destinations/da-lat","Đà Lạt"]]){
  await page.goto(url);await expect(page.getByRole("heading",{level:1})).toContainText(heading);
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 expect(errors).toEqual([]);
});
test("map is explicitly a schematic, not navigation",async({page})=>{
 await page.goto("/plan/new");await expect(page.getByRole("img",{name:/Phác đồ vị trí tương đối/})).toBeVisible();
 await expect(page.getByText("Không thay thế chỉ đường",{exact:false})).toBeVisible();
});
test("no Javascript keeps essential destination navigation visible",async({browser},info)=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:info.project.use.viewport});
 try{const page=await context.newPage();await page.goto("http://127.0.0.1:3391/");
 await expect(page.getByRole("heading",{level:1})).toContainText("Đi đâu,");
 await page.getByRole("link",{name:/Nha Trang/}).click();await expect(page.getByRole("heading",{level:1})).toHaveText("Nha Trang.");
 }finally{await context.close();}
});
