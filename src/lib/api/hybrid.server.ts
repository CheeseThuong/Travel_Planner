import { generateHybridPreview } from "@/application/planning/hybrid";
import { editorialDiscoveryCatalogs } from "@/adapters/discovery/editorial.server";
import { GroqRecommendations } from "@/adapters/recommendations/groq.server";
import { RecommendationInputError } from "@/domain/discovery/recommendations";
import type { TripDraft } from "@/domain/model/trip";
import type { RoutingProvider } from "@/domain/ports/providers";
import type { RecommendationProvider } from "@/domain/ports/recommendations";
import type { PlaceSearchProvider } from "@/domain/discovery/search";
import type { DiscoveryPlace, PlaceSource } from "@/domain/discovery/place";
import { parseServerEnv } from "@/lib/config/env.server";
import { ApiError, readJson, success, withApi } from "./http.server";
import { configuredDiscoveryProvider } from "./discovery.server";
import { createRequestLimiter } from "./request-limit.server";
import { hybridInputSchema, hybridPreviewSchema, transientDiscoverySchema } from "./hybrid-schema.server";

let runtimeRanker: GroqRecommendations | undefined;
function configuredRanker(): RecommendationProvider | undefined {
  const env = parseServerEnv(); if (!env.GROQ_ENABLED) return undefined;
  return runtimeRanker ??= new GroqRecommendations({ apiKey: env.GROQ_API_KEY!, model: env.GROQ_MODEL!, costControlsApproved: true, zdrConfirmed: true, dailyRequestLimit: env.GROQ_DAILY_REQUEST_LIMIT, minuteRequestLimit: env.GROQ_MINUTE_REQUEST_LIMIT, dailyTokenLimit: env.GROQ_DAILY_TOKEN_LIMIT, dailyBudgetMicroUsd: env.GROQ_DAILY_BUDGET_MICRO_USD, inputUsdPerMillion: env.GROQ_INPUT_USD_PER_MILLION, outputUsdPerMillion: env.GROQ_OUTPUT_USD_PER_MILLION, maxCompletionTokens: env.GROQ_MAX_COMPLETION_TOKENS, timeoutMs: env.GROQ_TIMEOUT_MS });
}
/** Public preview cannot trust client assertions of editorial identity or verified facts. */
function canonicalDraft(draft: TripDraft): TripDraft {
  return { ...draft, stops: draft.stops.map(stop => {
    if (stop.catalog_place_id) {
      const place = editorialDiscoveryCatalogs[draft.destination_slug].find(candidate => candidate.id === stop.catalog_place_id);
      if (!place) throw new ApiError(422, "VALIDATION_ERROR", "Điểm danh mục không thuộc thành phố hoặc chưa có nguồn độc lập.");
      return { ...stop, user_title: place.title_vi, location: { ...place.location }, coordinate_provenance: "editorial" as const, hours: place.hours, transport_constraint: place.transport_constraint, provider_place_id: undefined };
    }
    if (stop.coordinate_provenance !== "user_entered" || stop.hours.state !== "hours_unknown" || stop.provider_place_id) throw new ApiError(422, "VALIDATION_ERROR", "Điểm nhập tay cần tọa độ do bạn xác nhận và trạng thái chưa xác minh; metadata provider cần nguồn độc lập.");
    return { ...stop, transport_constraint: stop.transport_constraint === "manual_transfer" ? "manual_transfer" as const : "access_unverified" as const };
  }) };
}
interface Dependencies { readonly discovery?: PlaceSearchProvider; readonly ranker?: RecommendationProvider; readonly routing?: RoutingProvider }
export function createHybridHandler(injected: Dependencies = {}) {
  const limit = createRequestLimiter(20, 60_000);
  return (request: Request) => withApi(request, async id => {
    limit();
    try {
      if (request.signal.aborted) throw new ApiError(503, "PROVIDER_UNAVAILABLE", "Yêu cầu xem trước đã dừng.");
      const input = await readJson(request, hybridInputSchema, 65536), draft = canonicalDraft(input.draft), configurationWarnings: string[] = [];
      let discovery = injected.discovery, ranker = injected.ranker;
      let transientPlaces: readonly DiscoveryPlace[]=[];
      if (input.use_provider && !discovery) { try { discovery = configuredDiscoveryProvider(); } catch { configurationWarnings.push("DISCOVERY_CONFIGURATION_UNAVAILABLE"); } }
      if (input.use_ai && !ranker) { try { ranker = configuredRanker(); } catch { configurationWarnings.push("AI_CONFIGURATION_UNAVAILABLE"); } }
      const result = await generateHybridPreview(draft, input.preferences, { catalog: editorialDiscoveryCatalogs[draft.destination_slug], clock: { now: () => new Date() }, seed: input.seed, plan_run_id: crypto.randomUUID(), discovery, ranker, routing: injected.routing, use_discovery: input.use_provider, use_ai: input.use_ai,on_transient_discovery:places=>{transientPlaces=places;} }, request.signal);
      if (result.planning.status === "conflict") throw new ApiError(422, "PLANNING_INFEASIBLE", "Có xung đột điểm đã khóa. Các điểm đã chọn vẫn được giữ.", { conflicts: result.planning.conflicts, unscheduled: result.planning.unscheduled });
      const parsed = hybridPreviewSchema.safeParse({ ...result, warnings: [...new Set([...result.warnings, ...configurationWarnings])].sort() });
      if (!parsed.success) throw new ApiError(503, "PROVIDER_UNAVAILABLE", "Ứng viên chưa đáp ứng hợp đồng dữ liệu; đầu vào vẫn được giữ.");
      const source=(value:PlaceSource):PlaceSource=>{let url:string|null=null;try{const parsed=new URL(value.url??"");if(parsed.protocol==="https:"&&!parsed.username&&!parsed.password){parsed.search="";parsed.hash="";url=parsed.href;}}catch{}return {...value,provider_id:null,url};};
      const transient=transientDiscoverySchema.safeParse({retention:"request_only",saving_allowed:false,places:transientPlaces.map(place=>({...place,coordinate_source:source(place.coordinate_source),sources:place.sources.map(source)}))});
      // Deliberately outside exportable data. No provider identities, caching or persistence.
      const response=success(parsed.data,id);
      if(transient.success&&transient.data.places.length)return Response.json({data:parsed.data,transient:transient.data,meta:{request_id:id}},{headers:response.headers});
      return response;
    } catch (error) {
      if (request.signal.aborted) throw new ApiError(503, "PROVIDER_UNAVAILABLE", "Yêu cầu xem trước đã dừng.");
      if (error instanceof RecommendationInputError || error instanceof RangeError) throw new ApiError(422, "VALIDATION_ERROR", "Kiểm tra ngày, điểm bắt buộc/loại trừ, bộ lọc và chế độ lập lịch; không có điểm nào được tự bỏ.");
      throw error;
    }
  });
}
