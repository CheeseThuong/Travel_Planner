import { afterEach, expect, test, vi } from "vitest";
import { generateHybridPreview } from "@/application/planning/hybrid";
import { verifyPlanningResult } from "@/domain/planning/verify";
import { routingInputForDraft } from "@/domain/routing/matrix";
import { ApproximateRoutingProvider } from "@/adapters/routing/approximate";
import { editorialDiscoveryCatalogs } from "@/adapters/discovery/editorial.server";
import { plannerDraft, plannerStop, fixedClock } from "../fixtures/planner";
import type { RecommendationProvider } from "@/domain/ports/recommendations";
import type { HybridContext } from "@/application/planning/hybrid";

afterEach(()=>vi.useRealTimers());
const places = editorialDiscoveryCatalogs["nha-trang"];
const context: HybridContext = { catalog: places, clock: fixedClock, seed: 42, plan_run_id: "f8100000-0000-4000-8000-000000000001" };
const stopFor = (index: number) => plannerStop(places[index].id, { catalog_place_id: places[index].id, user_title: places[index].title_vi, location: places[index].location, requested_duration_min: places[index].suggested_duration_min!, hours: places[index].hours, transport_constraint: places[index].transport_constraint, is_required: index % 2 === 0 });

test.each([0,1,2,30])("hybrid preview from %i selections keeps original stops and accounts every candidate exactly once with approximate provenance", async count=>{
  const draft=plannerDraft({stops:Array.from({length:count},(_,index)=>stopFor(index))}), before=structuredClone(draft);
  const result=await generateHybridPreview(draft,{},context);
  expect(result).toMatchObject({preview_only:true,requires_confirmation:true,ranking_source:"deterministic",usage:{discovery_requests_attempted:0,ranking_requests_attempted:0,matrix_elements_requested:0}});
  expect(result.candidate_draft.stops.slice(0,count)).toEqual(draft.stops);expect(result.original_stop_ids).toEqual(draft.stops.map(stop=>stop.id));
  expect(result.planning.status).toBe("candidate");if(result.planning.status!=="candidate")throw new Error("Unexpected unlocked conflict");
  const visits=result.planning.candidate.days.flatMap(day=>day.stops),accounted=[...visits.map(stop=>stop.stop_id),...result.planning.unscheduled.map(stop=>stop.stop_id)];
  expect(new Set(accounted).size).toBe(result.candidate_draft.stops.length);expect(accounted.length).toBe(result.candidate_draft.stops.length);
  expect(visits.every(stop=>stop.estimate_source==="approximate")).toBe(true);expect(result.warnings).toContain("APPROXIMATE_NOT_ROAD_ETA");
  expect(result.suggested_places.every(place=>places.some(original=>original.id===place.id))).toBe(true);expect(draft).toEqual(before);
});
test("validated AI ordering changes only extra suggestions; malformed ranking falls back with no selected/required loss",async()=>{
  const rank=vi.fn<RecommendationProvider["rank"]>().mockImplementation(async(_preferences,candidates)=>({ordered:[...candidates].reverse().map(place=>({id:place.id,reason:"general_suggestion"})),model:"fixture",usage:{requests_attempted:1,reserved_tokens:10,reserved_cost_micro_usd:1}}));
  const draft=plannerDraft({stops:[stopFor(0)]}), result=await generateHybridPreview(draft,{max_suggestions:2},{...context,use_ai:true,ranker:{rank}});
  expect(result.ranking_source).toBe("groq");expect(result.candidate_draft.stops[0]).toEqual(draft.stops[0]);
  expect(result.suggested_places.map(place=>place.id)).toEqual([...rank.mock.calls[0][1]].reverse().slice(0,2).map(place=>place.id));
  rank.mockResolvedValue({ordered:[{id:"invented",reason:"general_suggestion"}],model:"fixture-secret-ignored",usage:{requests_attempted:1,reserved_tokens:1,reserved_cost_micro_usd:1}});
  const fallback=await generateHybridPreview(draft,{}, {...context,use_ai:true,ranker:{rank}}), deterministic=await generateHybridPreview(draft,{},context);
  expect(fallback.suggested_places).toEqual(deterministic.suggested_places);expect(fallback.ranking_source).toBe("deterministic");expect(fallback.warnings).toContain("AI_UNAVAILABLE_FALLBACK");expect(fallback.usage.ranking_requests_attempted).toBe(1);expect(JSON.stringify(fallback)).not.toContain("fixture-secret-ignored");
});
test("request-only external facts/identities never contaminate a known selection, AI input, candidate or exportable diagnostics",async()=>{
  const restricted={...places[0].coordinate_source,provider:"brave" as const,provider_id:"private-temporary-poi",retention:"request_only" as const};
  const external={...places[0],title_vi:"Private transient title",coordinate_source:restricted,sources:[restricted]};
  const search=vi.fn().mockResolvedValue({places:[external],warnings:["raw private provider body"],requests_attempted:1,window_limited:false});
  const rank=vi.fn<RecommendationProvider["rank"]>().mockImplementation(async(_preferences,candidates)=>({ordered:candidates.map(place=>({id:place.id,reason:"general_suggestion"})),model:"fixture",usage:{requests_attempted:1,reserved_tokens:1,reserved_cost_micro_usd:1}}));
  const result=await generateHybridPreview(plannerDraft({stops:[stopFor(0)]}),{}, {...context,use_discovery:true,use_ai:true,discovery:{search},ranker:{rank}});
  expect(result.external_confirmation_count).toBe(1);expect(result.warnings).toContain("EXTERNAL_PLACES_REQUIRE_INDEPENDENT_CONFIRMATION");expect(search).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(rank.mock.calls)).not.toContain("Private transient");expect(JSON.stringify(result)).not.toContain("private-temporary-poi");expect(JSON.stringify(result)).not.toContain("Private transient title");
  expect(result.candidate_draft.stops[0]).toEqual(stopFor(0));
});
test("provider failures/quotas and hanging transports return deterministic fallback under deadlines without retry",async()=>{
  vi.useFakeTimers();
  const search=vi.fn().mockImplementation(()=>new Promise(()=>{})),rank=vi.fn().mockImplementation(()=>new Promise(()=>{}));
  const pending=generateHybridPreview(plannerDraft({stops:[stopFor(0)]}),{}, {...context,use_discovery:true,use_ai:true,discovery:{search},ranker:{rank},discovery_timeout_ms:10,ranking_timeout_ms:10});
  await vi.advanceTimersByTimeAsync(50);const result=await pending;
  expect(result.warnings).toEqual(expect.arrayContaining(["DISCOVERY_TIMEOUT_FALLBACK","AI_TIMEOUT_FALLBACK","PROVIDER_USAGE_UNKNOWN"]));expect(result.usage.discovery_requests_attempted).toBeNull();expect(result.usage.ranking_requests_attempted).toBeNull();expect(search).toHaveBeenCalledTimes(1);expect(rank).toHaveBeenCalledTimes(1);
  search.mockRejectedValue({reason:"quota",requests_attempted:0});rank.mockRejectedValue({reason:"quota",requests_attempted:0});
  const quota=await generateHybridPreview(plannerDraft(),{}, {...context,use_discovery:true,use_ai:true,discovery:{search},ranker:{rank}});
  expect(quota.warnings).toEqual(expect.arrayContaining(["DISCOVERY_QUOTA_FALLBACK","AI_QUOTA_FALLBACK"]));expect(quota.usage).toMatchObject({discovery_requests_attempted:0,ranking_requests_attempted:0});
});
test("routing failure/malformed matrix uses existing bounded approximate fallback; directed fixture cells remain directed",async()=>{
  const estimateMatrix=vi.fn().mockRejectedValue(new Error("private route provider failure"));
  const fallback=await generateHybridPreview(plannerDraft(),{max_suggestions:2},{...context,routing:{estimateMatrix}});
  expect(fallback.warnings).toContain("PROVIDER_UNAVAILABLE");expect(fallback.usage.matrix_elements_requested).toBeNull();expect(JSON.stringify(fallback)).not.toContain("private route");expect(estimateMatrix).toHaveBeenCalledTimes(1);
  estimateMatrix.mockImplementation(async input=>({node_ids:input.nodes.map((node:{id:string})=>node.id),cells:input.nodes.map((_:unknown,from:number)=>input.nodes.map((__:unknown,to:number)=>({status:"reachable",duration_minutes:from===to?0:from<to?1:19,estimate_source:"approximate",uncertainty:"high"}))),warnings:["private route provider note"],elements_requested:0}));
  const directed=await generateHybridPreview(plannerDraft(),{max_suggestions:2},{...context,routing:{estimateMatrix}});expect(directed.warnings).toContain("ROUTING_WARNING_REDACTED");expect(JSON.stringify(directed)).not.toContain("private route provider note");expect(directed.planning.status).toBe("candidate");
});
test("empty interests pool, required island transfer and locked conflict are explicit outcomes",async()=>{
  const empty=await generateHybridPreview(plannerDraft(),{interests:["food"]},context);expect(empty.empty).toBe(true);expect(empty.suggested_places).toEqual([]);
  const island=places.findIndex(place=>place.transport_constraint==="manual_transfer"),required={...stopFor(island),is_required:true};
  const infeasible=await generateHybridPreview(plannerDraft({stops:[required]}),{auto_suggest:false},context);expect(infeasible.planning.unscheduled).toContainEqual({stop_id:required.id,reason:"UNREACHABLE",message:"MANUAL_TRANSFER_REQUIRED"});
  const locked={...required,lock:{plan_date:"2026-11-06",start_local:"11:00",sort_index:0}};
  const conflict=await generateHybridPreview(plannerDraft({stops:[locked]}),{},context);expect(conflict.planning.status).toBe("conflict");expect(conflict.candidate_draft.stops[0].lock).toEqual(locked.lock);expect(conflict.planning.unscheduled.some(stop=>stop.stop_id===locked.id)).toBe(true);
});
test("post-verifier rejects modified times, silent drops and missing required diagnostics",async()=>{
  const result=await generateHybridPreview(plannerDraft({stops:[stopFor(0)]}),{max_suggestions:0},context);
  if(result.planning.status!=="candidate")throw new Error("Expected candidate fixture");
  const matrix=await new ApproximateRoutingProvider().estimateMatrix(routingInputForDraft(result.candidate_draft));
  const altered=structuredClone(result.planning),day=altered.candidate.days.find(day=>day.stops.length>0)!;
  (day.stops[0] as {start_local:string}).start_local="00:00";expect(()=>verifyPlanningResult(result.candidate_draft,altered,matrix,fixedClock)).toThrow("Candidate verification failed");
  const missing=structuredClone(result.planning);(missing.candidate.days as {stops:unknown[]}[]).forEach(day=>{day.stops=[];});expect(()=>verifyPlanningResult(result.candidate_draft,missing,matrix,fixedClock)).toThrow("Candidate verification failed");
  const island=places.findIndex(place=>place.transport_constraint==="manual_transfer"),infeasible=await generateHybridPreview(plannerDraft({stops:[{...stopFor(island),is_required:true}]}),{auto_suggest:false},context);
  if(infeasible.planning.status!=="candidate")throw new Error("Expected unlocked required fixture");
  const alteredRequired=structuredClone(infeasible.planning);(alteredRequired.candidate as {unfulfilled_required:string[]}).unfulfilled_required=[];
  const islandMatrix=await new ApproximateRoutingProvider().estimateMatrix(routingInputForDraft(infeasible.candidate_draft));expect(()=>verifyPlanningResult(infeasible.candidate_draft,alteredRequired,islandMatrix,fixedClock)).toThrow("Candidate verification failed");
});
test("caller abort stops all work and invalid inputs never reach external providers",async()=>{
  const search=vi.fn(),rank=vi.fn(),controller=new AbortController();controller.abort();
  await expect(generateHybridPreview(plannerDraft(),{}, {...context,use_discovery:true,use_ai:true,discovery:{search},ranker:{rank}},controller.signal)).rejects.toBeDefined();expect(search).not.toHaveBeenCalled();expect(rank).not.toHaveBeenCalled();
  await expect(generateHybridPreview(plannerDraft({end_date:"2026-11-99"}),{}, {...context,use_discovery:true,discovery:{search}})).rejects.toThrow("INVALID_DRAFT");expect(search).not.toHaveBeenCalled();
});
