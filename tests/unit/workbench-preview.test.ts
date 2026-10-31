import { expect, test, vi } from "vitest";
import { workbenchPreview } from "@/adapters/planning/workbench-preview";
import { generateHybridPreview } from "@/application/planning/hybrid";
import { discoveryPreferences } from "@/domain/discovery/recommendations";
import { editorialDiscoveryCatalogs } from "@/adapters/discovery/editorial.server";
import { plannerDraft, fixedClock } from "../fixtures/planner";

const draft=plannerDraft({id:"f9100000-0000-4000-8000-000000000001"}),preferences=discoveryPreferences(),catalog=editorialDiscoveryCatalogs["nha-trang"];
test("offline and failed HTTP transport use the same source-safe pipeline without retry or input mutation",async()=>{
  const fetcher=vi.fn<typeof fetch>().mockRejectedValue(new Error("fixture unavailable")),before=structuredClone(draft);
  const offline=await workbenchPreview(draft,preferences,catalog,{online:false,useAi:true,useProvider:true,fetcher,clock:fixedClock});expect(offline.source).toBe("offline");expect(fetcher).not.toHaveBeenCalled();expect(offline.preview.suggested_places.length).toBeGreaterThan(0);
  const fallback=await workbenchPreview(draft,preferences,catalog,{online:true,useAi:false,useProvider:false,fetcher,clock:fixedClock});expect(fallback.source).toBe("local_fallback");expect(fetcher).toHaveBeenCalledTimes(1);expect(fallback.preview.suggested_places).toEqual(offline.preview.suggested_places);expect(draft).toEqual(before);
});
test("server candidate stays separate from temporary provider display and rejects missing/mismatched identity envelopes",async()=>{
  const preview=await generateHybridPreview(draft,preferences,{catalog,clock:fixedClock,seed:42,plan_run_id:"f9110000-0000-4000-8000-000000000001"});
  const transient={retention:"request_only",saving_allowed:false,places:[{...catalog[0],title_vi:"Temporary fixture, never export"}]};
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(Response.json({data:preview,transient}));
  const result=await workbenchPreview(draft,preferences,catalog,{online:true,useAi:false,useProvider:true,fetcher,clock:fixedClock});expect(result.source).toBe("server");expect(result.transient?.places).toHaveLength(1);expect(JSON.stringify(result.preview)).not.toContain("Temporary fixture, never export");
  fetcher.mockResolvedValue(Response.json({data:{...preview,original_stop_ids:["unexpected"]}}));
  expect((await workbenchPreview(draft,preferences,catalog,{online:true,useAi:false,useProvider:false,fetcher,clock:fixedClock})).source).toBe("local_fallback");
});
test("validation/lock responses preserve the existing UI candidate; caller abort never triggers local work",async()=>{
  const fetcher=vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({error:{message:"Fix locked stop"}},{status:422}));
  await expect(workbenchPreview(draft,preferences,catalog,{online:true,useAi:false,useProvider:false,fetcher})).rejects.toThrow("Fix locked stop");expect(fetcher).toHaveBeenCalledTimes(1);
  const abort=new AbortController();abort.abort();await expect(workbenchPreview(draft,preferences,catalog,{online:true,useAi:false,useProvider:false,fetcher,signal:abort.signal})).rejects.toBeDefined();expect(fetcher).toHaveBeenCalledTimes(1);
});
