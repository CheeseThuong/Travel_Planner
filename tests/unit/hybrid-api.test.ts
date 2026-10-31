import { writeFileSync } from "node:fs";
import { afterEach, expect, test, vi } from "vitest";
import { z } from "zod";
import { createHybridHandler } from "@/lib/api/hybrid.server";
import { hybridInputSchema, hybridPreviewSchema, transientDiscoverySchema } from "@/lib/api/hybrid-schema.server";
import { editorialDiscoveryCatalogs } from "@/adapters/discovery/editorial.server";
import { plannerDraft, plannerStop } from "../fixtures/planner";
import spec from "../../docs/openapi.json";

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
const id="f8200000-0000-4000-8000-000000000001";
const draft=()=>plannerDraft({id});
const request=(body:unknown)=>new Request("http://localhost/api/v1/plans/preview",{method:"POST",headers:{"content-type":"application/json","x-request-id":id},body:typeof body==="string"?body:JSON.stringify(body)});
function noLive(){vi.stubEnv("DEPLOYMENT_ENV","local");vi.stubEnv("CLOUD_ENABLED","false");vi.stubEnv("BRAVE_ENABLED","false");vi.stubEnv("GROQ_ENABLED","false");return vi.spyOn(globalThis,"fetch").mockRejectedValue(new Error("Outbound disabled in fixture"));}

test("public no-key preview returns a strict source-preserving candidate from zero selections without any owner mutation/network",async()=>{
  const fetcher=noLive(),input={draft:draft(),use_ai:true,use_provider:true},before=structuredClone(input),response=await createHybridHandler()(request(input));
  expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toBe("no-store");expect(response.headers.get("x-request-id")).toBe(id);
  const result=hybridPreviewSchema.parse((await response.json()).data);expect(result.original_stop_ids).toEqual([]);expect(result.suggested_places.length).toBeGreaterThan(0);expect(result.requires_confirmation).toBe(true);expect(result.preview_only).toBe(true);
  expect(result.warnings).toEqual(expect.arrayContaining(["AI_DISABLED_DETERMINISTIC_FALLBACK","DISCOVERY_DISABLED_CATALOG_FALLBACK","APPROXIMATE_NOT_ROAD_ETA"]));expect(result.usage).toMatchObject({discovery_requests_attempted:0,ranking_requests_attempted:0,matrix_elements_requested:0});expect(input).toEqual(before);expect(fetcher).not.toHaveBeenCalled();
});
test("catalog identity is server-resolved; forged location/title/hours/access never schedules an island as a road visit",async()=>{
  noLive();const island=editorialDiscoveryCatalogs["nha-trang"].find(place=>place.transport_constraint==="manual_transfer")!;
  const stop=plannerStop(island.id,{catalog_place_id:island.id,user_title:"Client-forged venue fact",location:{lat:0,lng:0},coordinate_provenance:"editorial",requested_duration_min:45,is_required:true,hours:{state:"verified_editorial",checked_at:"2026-10-30T00:00:00Z",source:"client claim",intervals:[{weekday:5,start_local:"00:00",end_local:"24:00"}]},transport_constraint:"land"});
  const handler=createHybridHandler(),response=await handler(request({draft:{...draft(),stops:[stop]},preferences:{auto_suggest:false}}));expect(response.status).toBe(200);
  const result=(await response.json()).data;expect(result.candidate_draft.stops[0]).toMatchObject({id:island.id,user_title:island.title_vi,location:island.location,hours:{state:"hours_unknown"},transport_constraint:"manual_transfer",requested_duration_min:45,is_required:true});
  expect(result.planning.unscheduled).toEqual([{stop_id:island.id,reason:"UNREACHABLE",message:"MANUAL_TRANSFER_REQUIRED"}]);
  const conflict=await handler(request({draft:{...draft(),stops:[{...stop,lock:{plan_date:"2026-11-06",start_local:"11:00",sort_index:0}}]}}));expect(conflict.status).toBe(422);expect((await conflict.json()).error).toMatchObject({code:"PLANNING_INFEASIBLE",details:{unscheduled:expect.arrayContaining([expect.objectContaining({stop_id:island.id})])}});
});
test("strict inputs/body/rate/cancellation and unexpected reader failure use predictable redacted errors",async()=>{
  noLive();const logged=vi.spyOn(console,"info").mockImplementation(()=>{}),handler=createHybridHandler();
  const manual=plannerStop("f8210000-0000-4000-8000-000000000001");
  for(const [body,status] of [["{",400],[" ".repeat(65537),413],[{draft:{...draft(),owner_id:"forged"}},422],[{draft:{...draft(),end_date:"2026-11-99"}},422],[{draft:draft(),confirmed:true},422],[{draft:{...draft(),planning_mode:"manual"}},422],[{draft:{...draft(),stops:[{...manual,coordinate_provenance:"editorial"}]}},422],[{draft:{...draft(),stops:[{...manual,provider_place_id:"restricted-provider-poi"}]}},422],[{draft:{...draft(),stops:[manual]},preferences:{excluded_place_ids:[manual.id]}},422]] as const){
    const response=await handler(request(body));expect(response.status).toBe(status);expect(response.headers.get("x-request-id")).toBe(id);expect(response.headers.get("cache-control")).toBe("no-store");
  }
  const abort=new AbortController();abort.abort();const cancelled=await handler(new Request("http://localhost/api/v1/plans/preview",{method:"POST",body:"{}",signal:abort.signal}));expect(cancelled.status).toBe(503);
  const broken=new Request("http://localhost/api/v1/plans/preview",{method:"POST",body:new ReadableStream({start(controller){controller.error(new Error("Private body reader failure"));}}),duplex:"half"} as RequestInit);
  const unexpected=await handler(broken);expect(unexpected.status).toBe(500);expect(await unexpected.text()).not.toContain("Private body");expect(JSON.stringify(logged.mock.calls)).not.toContain("restricted-provider-poi");
  const limited=createHybridHandler();for(let count=0;count<20;count++)await limited(request({}));expect((await limited(request({}))).status).toBe(429);
});
test("configured-provider errors fall back; fixture AI cannot inject unknown identity or leak its raw model/content",async()=>{
  noLive();vi.stubEnv("GROQ_ENABLED","true");vi.stubEnv("GROQ_API_KEY","fixture-private-key");
  const handler=createHybridHandler(),response=await handler(request({draft:draft(),use_ai:true}));expect(response.status).toBe(200);const raw=await response.text();expect(raw).not.toContain("fixture-private-key");expect(JSON.parse(raw).data.warnings).toContain("AI_CONFIGURATION_UNAVAILABLE");
  const rank=vi.fn().mockResolvedValue({ordered:[{id:"invented",reason:"general_suggestion"}],model:"private-model-content",usage:{requests_attempted:1,reserved_tokens:1,reserved_cost_micro_usd:1}});
  const fixture=await createHybridHandler({ranker:{rank}})(request({draft:draft(),use_ai:true}));expect(fixture.status).toBe(200);const data=(await fixture.json()).data;expect(data.ranking_source).toBe("deterministic");expect(JSON.stringify(data)).not.toContain("private-model-content");expect(rank).toHaveBeenCalledTimes(1);
});
test("maintained hybrid request/result contracts equal strict runtime schemas",()=>{
  const schemas={HybridInput:z.toJSONSchema(hybridInputSchema,{io:"input"}),HybridPreview:z.toJSONSchema(hybridPreviewSchema),TransientDiscovery:z.toJSONSchema(transientDiscoverySchema)};
  writeFileSync("docs/reports/evidence/AI02-02-openapi-schemas.json",JSON.stringify(schemas,null,2)+"\n");
  for(const [name,schema]of Object.entries(schemas))expect((spec.components.schemas as Record<string,unknown>)[name],name).toEqual(schema);
});
test("temporary discovery is view-only outside exportable data, redacts provider IDs/URL secrets and never reaches AI",async()=>{
  noLive();const original=editorialDiscoveryCatalogs["nha-trang"][0],source={...original.coordinate_source,provider:"brave" as const,provider_id:"temporary-private-poi-id",url:"https://example.com/venue?token=private-url-value#secret",retention:"request_only" as const};
  const transient={...original,id:"brave:fixture-hash",title_vi:"Transient fixture venue",coordinate_source:source,sources:[source]};
  const search=vi.fn().mockResolvedValue({places:[transient],requests_attempted:1,warnings:[],window_limited:false});
  const response=await createHybridHandler({discovery:{search}})(request({draft:draft(),use_provider:true}));expect(response.status).toBe(200);const body=await response.json();
  expect(transientDiscoverySchema.parse(body.transient).places[0].title_vi).toBe("Transient fixture venue");expect(body.transient.saving_allowed).toBe(false);expect(body.transient.places[0].coordinate_source.provider_id).toBeNull();expect(body.transient.places[0].coordinate_source.url).toBe("https://example.com/venue");
  expect(JSON.stringify(body.data)).not.toContain("Transient fixture venue");expect(JSON.stringify(body)).not.toContain("temporary-private-poi-id");expect(JSON.stringify(body)).not.toContain("private-url-value");
});
