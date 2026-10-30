import { describe, expect, it } from "vitest";
import { newPlanCode, validatedSavedPlan } from "@/lib/doc/saved-plan";
import { requestSchema } from "@/lib/doc/cloud-plan-schema";
const uuid1="a15244ea-5120-4000-8000-000000000001", uuid2="a15244ea-5120-4000-8000-000000000002";
function example(){return {
  schemaVersion:1,code:newPlanCode(new Uint8Array(24).fill(17)), createdAt:"2026-10-30T02:00:00.000Z",status:"confirmed_preview",
  draft:{id:uuid1,version:1,title:"Đà Lạt 2 ngày",destination_slug:"da-lat",timezone:"Asia/Ho_Chi_Minh",
    start_date:"2026-11-02",end_date:"2026-11-03",arrival_local_time:"08:00",departure_local_time:"18:00",
    base_location:{label:"Nơi lưu trú",lat:11.94,lng:108.43,temporary:false}, transport_mode:"drive",pace:"balanced",party_size:2,planning_mode:"assisted",
    budget:{currency:"VND",total_vnd:4000000,known_costs_vnd:{lodging:1000000,transport:0,meals:0,other:0}},
    preferences:{day_start:"08:00",day_end:"20:00",lunch_buffer_minutes:60,rest_buffer_minutes:15,return_to_base:true},
    stops:[{id:uuid2,destination_slug:"da-lat",user_title:"Chợ Đà Lạt",location:{lat:11.9434,lng:108.4372},coordinate_provenance:"user_entered",requested_duration_min:60,is_required:true,hours:{state:"hours_unknown"},transport_constraint:"access_unverified",cost_estimate:{provenance:"unknown"}}]},
  days:[{date:"2026-11-02",stops:[{id:uuid2,start:"10:00",end:"11:00",travel:25}]},{date:"2026-11-03",stops:[]}],
  warnings:["Giờ chưa được xác minh"],
};}
describe("DỌC private plan storage contract",()=>{
 it("generates 192-bit capability code; rejects weak identifiers",()=>{
   const a=newPlanCode(new Uint8Array(24).fill(17));const b=newPlanCode(new Uint8Array(24).fill(18));
   expect(a).toMatch(/^DOC-[A-Za-z0-9_-]{32}$/);expect(a).not.toBe(b);
   expect(()=>newPlanCode(new Uint8Array(8))).toThrow();
   expect(requestSchema.safeParse({action:"open",code:"DOC-123"}).success).toBe(false);
 });
 it("accepts a validated scheduled plan and rejects phantom/duplicate stops",()=>{
   const sample=example();expect(validatedSavedPlan(sample).draft.base_location.label).toBe("Nơi lưu trú");
   expect(()=>validatedSavedPlan({...sample,days:[{date:"2026-11-02",stops:[{id:"a15244ea-5120-4000-8000-000000000099",start:"10:00",end:"11:00",travel:0}]}]})).toThrow();
   expect(()=>validatedSavedPlan({...sample,days:[...sample.days,{date:"2026-11-02",stops:sample.days[0].stops}]})).toThrow();
 });
 it("validates cloud action without accepting arbitrary objects",()=>{
   expect(requestSchema.safeParse({action:"publish",plan:example()}).success).toBe(true);
   expect(requestSchema.safeParse({action:"open",code:example().code}).success).toBe(true);
   expect(requestSchema.safeParse({action:"remove",code:example().code}).success).toBe(true);
   expect(requestSchema.safeParse({action:"publish",plan:{x:1}}).success).toBe(false);
 });
});
