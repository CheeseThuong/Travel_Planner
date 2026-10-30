import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

async function basics(page){await page.goto("/plan/new?destination=da-lat");await page.getByLabel("Ngày bắt đầu").fill("2026-11-10");await page.getByLabel("Ngày kết thúc").fill("2026-11-11");}
const generate=page=>page.getByRole("button",{name:/XẾP LỊCH TRÌNH/}).click();
const queue=page=>page.getByRole("list",{name:"Các điểm đã thêm"});
test("zero-selection basics generate a sourced candidate, then explicit confirmation adds suggestions in order",async({page})=>{
  await basics(page);await expect(page.getByLabel("Giờ đến")).toBeHidden();await expect(page.getByLabel("Gợi ý thêm điểm phù hợp")).toBeChecked();
  await generate(page);const suggestions=page.getByRole("region",{name:"Các điểm gợi ý"});await expect(suggestions).toBeVisible();
  const names=await suggestions.getByRole("listitem").locator("strong").allTextContents();expect(names.length).toBeGreaterThan(0);await expect(queue(page)).toHaveCount(0);
  await expect(suggestions.getByRole("link").first()).toHaveAttribute("href",/^https:\/\/www.openstreetmap.org\//);
  await suggestions.getByRole("button",{name:/Xác nhận thêm/}).click();await expect(queue(page).getByRole("listitem")).toHaveCount(names.length);expect(await queue(page).getByRole("listitem").locator("strong").allTextContents()).toEqual(names);
  await expect(page.getByRole("tablist",{name:"Ngày trong lịch trình"})).toHaveCount(0);await generate(page);await expect(page.getByRole("tablist",{name:"Ngày trong lịch trình"})).toBeVisible();
});
for(const count of [1,2])test(`${count} selected places and required flags survive automatic extra suggestions before confirmation`,async({page})=>{
  await basics(page);for(const title of ["Chợ Đà Lạt","Vườn hoa thành phố"].slice(0,count))await page.locator('[aria-label="Chọn điểm ghé"] button').filter({hasText:title}).first().click();
  await page.getByLabel("Bắt buộc Chợ Đà Lạt").check();const response=page.waitForResponse(response=>response.url().endsWith("/api/v1/plans/preview")&&response.request().method()==="POST");await generate(page);const body=(await(await response).json()).data;
  expect(body.original_stop_ids).toHaveLength(count);expect(body.suggested_places.length).toBeGreaterThan(0);expect(body.candidate_draft.stops.filter(stop=>body.original_stop_ids.includes(stop.id))).toHaveLength(count);
  await expect(queue(page).getByRole("listitem")).toHaveCount(count);await expect(page.getByLabel("Bắt buộc Chợ Đà Lạt")).toBeChecked();await expect(page.getByRole("region",{name:"Các điểm gợi ý"})).toBeVisible();
});
test("honest empty interests pool can be widened without inventing food places",async({page})=>{
  await basics(page);await page.getByLabel("Sở thích Ăn uống địa phương").check();await generate(page);await expect(page.locator(".atlas-result-note")).toContainText("Chưa có điểm độc lập");await expect(page.getByRole("region",{name:"Các điểm gợi ý"})).toHaveCount(0);
  await page.getByRole("button",{name:"Xóa lọc gợi ý"}).click();await expect(page.getByLabel("Sở thích Ăn uống địa phương")).not.toBeChecked();await generate(page);await expect(page.getByRole("region",{name:"Các điểm gợi ý"})).toBeVisible();
});
test("HTTP validation failure keeps prior candidate; server failure falls back once without losing selected/required input",async({page})=>{
  await basics(page);await page.locator('[aria-label="Chọn điểm ghé"] button').filter({hasText:"Chợ Đà Lạt"}).first().click();await page.getByLabel("Bắt buộc Chợ Đà Lạt").check();await generate(page);
  const tabs=page.getByRole("tablist",{name:"Ngày trong lịch trình"});await expect(tabs).toBeVisible();const before=await tabs.textContent();
  await page.route("**/api/v1/plans/preview",route=>route.fulfill({status:422,contentType:"application/json",body:'{"error":{"message":"Kiểm tra điểm khóa, giữ nguyên bản thử trước."}}'}));await generate(page);
  await expect(page.getByRole("region",{name:"Bạn muốn đi theo cách nào?"}).getByRole("alert")).toContainText("giữ nguyên bản thử trước");await expect(tabs).toHaveText(before);await expect(page.getByLabel("Bắt buộc Chợ Đà Lạt")).toBeChecked();
  await page.unroute("**/api/v1/plans/preview");let calls=0;await page.route("**/api/v1/plans/preview",route=>{calls++;return route.fulfill({status:503,contentType:"application/json",body:'{"error":{"message":"fixture unavailable"}}'});});await generate(page);
  await expect(page.locator(".atlas-result-note")).toContainText("thuật toán trên máy");expect(calls).toBe(1);await expect(queue(page).getByRole("listitem")).toHaveCount(1);await expect(page.getByLabel("Bắt buộc Chợ Đà Lạt")).toBeChecked();
});
test("offline zero-selection generation uses source-complete local catalog and no preview request",async({page,context})=>{
  await basics(page);let calls=0;page.on("request",request=>{if(request.url().endsWith("/api/v1/plans/preview"))calls++;});await context.setOffline(true);await generate(page);
  await expect(page.locator(".atlas-result-note")).toContainText("danh mục cục bộ khi ngoại tuyến");await expect(page.getByRole("region",{name:"Các điểm gợi ý"})).toBeVisible();expect(calls).toBe(0);await context.setOffline(false);
});
test("temporary discovery displays separately, never enters JSON export, and opens an empty independent pin flow",async({page})=>{
  await page.clock.install({time:new Date("2026-10-30T00:00:00Z")});
  await page.route("**/api/v1/plans/preview",async route=>{const response=await route.fetch(),body=await response.json(),source={provider:"brave",provider_id:null,url:"https://example.com/venue",license:"Fixture provider terms",retrieved_at:"2026-10-30T00:00:00Z",retention:"request_only"};body.data.external_confirmation_count=1;body.transient={retention:"request_only",saving_allowed:false,places:[{id:"brave:fixture-window",destination_slug:"da-lat",title_vi:"Temporary fixture display only",alternate_names:[],description:"Transient fixture",address:null,location:{lat:11.94,lng:108.45},coordinate_confidence:"provider_unverified",coordinate_source:source,sources:[source],categories:["landmarks"],tags:[],suggested_duration_min:null,hours:{state:"hours_unknown"},price:{state:"unknown"},accessibility:"unknown",transport_constraint:"access_unverified",interest_scores:{},moderation:"draft",warnings:[]}]};return route.fulfill({response,json:body});});
  await basics(page);await generate(page);const temporary=page.getByRole("region",{name:"Kết quả tìm mở rộng tạm thời"});await expect(temporary).toContainText("Temporary fixture display only");
  const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"TẢI BẢN NHÁP JSON"}).click();const download=await downloading,data=JSON.parse(await readFile(await download.path(),"utf8"));
  expect(data.preview_only).toBe(true);expect(data.discovery_preferences.auto_suggest).toBe(true);expect(data.preview.hybrid.suggested_places[0].sources[0].license).toBe("ODbL-1.0");expect(JSON.stringify(data)).not.toContain("Temporary fixture display only");expect(JSON.stringify(data)).not.toContain("brave:fixture-window");
  await temporary.getByRole("button",{name:"Nhập độc lập trên bản đồ"}).click();await expect(page.getByLabel("Tên điểm nhập tay")).toHaveValue("");await expect(page.getByLabel("Vĩ độ",{exact:true})).toHaveValue("");await expect(page.getByLabel("Kinh độ",{exact:true})).toHaveValue("");
  await page.clock.fastForward(300001);await expect(temporary).toHaveCount(0);await expect(page.getByRole("tablist",{name:"Ngày trong lịch trình"})).toBeVisible();
});
