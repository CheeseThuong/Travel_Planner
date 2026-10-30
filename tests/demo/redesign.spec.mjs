import {test,expect} from "@playwright/test";
test("atlas redesign is responsive across public entry points",async({page})=>{
 for(const route of ["/","/destinations/nha-trang","/destinations/da-lat","/plan/new"]){
  await page.goto(route);await expect(page.locator("main")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
});
test("clean browser logs no hydration mismatches",async({page})=>{
 const issues=[];page.on("console",msg=>{if(/hydration|didn't match the client/i.test(msg.text()))issues.push(msg.text())});
 page.on("pageerror",e=>{if(/hydration|didn't match/i.test(e.message))issues.push(e.message)});
 await page.goto("/plan/new?destination=da-lat");
 await page.getByLabel("Tìm trong catalog").fill("hoa");
 await expect(page.getByRole("main")).toBeVisible();expect(issues).toEqual([]);
});
