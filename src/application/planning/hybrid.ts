import type { DiscoveryPlace } from "@/domain/discovery/place";
import { getCityGeo } from "@/domain/discovery/cities";
import { prepareRecommendations, selectRecommendations, type DiscoveryPreferences, type RecommendationPool } from "@/domain/discovery/recommendations";
import type { PlaceSearchProvider } from "@/domain/discovery/search";
import { findDestination } from "@/domain/model/destination";
import type { TripDraft, TripStop } from "@/domain/model/trip";
import type { Clock, RoutingProvider } from "@/domain/ports/providers";
import type { RecommendationProvider } from "@/domain/ports/recommendations";
import { generatePlan, routingInputForDraft, type PlanningResult } from "@/domain/planning/engine";
import { verifyPlanningResult } from "@/domain/planning/verify";
import { BoundedRoutingProvider } from "@/adapters/routing/bounded";
import { filterDiscovery } from "@/domain/discovery/filter";

export interface HybridContext {
  readonly catalog: readonly DiscoveryPlace[]; readonly clock: Clock; readonly seed: number; readonly plan_run_id: string;
  readonly discovery?: PlaceSearchProvider; readonly ranker?: RecommendationProvider; readonly routing?: RoutingProvider;
  readonly use_discovery?: boolean; readonly use_ai?: boolean; readonly discovery_timeout_ms?: number; readonly ranking_timeout_ms?: number; readonly routing_timeout_ms?: number;
  readonly on_transient_discovery?: (places: readonly DiscoveryPlace[]) => void;
}
export interface HybridPreview {
  readonly preview_only: true; readonly requires_confirmation: true; readonly empty: boolean;
  readonly candidate_draft: TripDraft; readonly planning: PlanningResult; readonly original_stop_ids: readonly string[];
  readonly suggested_places: readonly DiscoveryPlace[];
  readonly external_confirmation_count: number;
  readonly filtered_candidates: RecommendationPool["filtered"]; readonly duplicates_removed: number;
  readonly warnings: readonly string[]; readonly ranking_source: "deterministic" | "groq";
  readonly usage: Readonly<{ discovery_requests_attempted: number | null; ranking_requests_attempted: number | null; matrix_elements_requested: number | null }>;
}
class ProviderDeadline extends Error {}
async function bounded<T>(operation: (signal: AbortSignal) => Promise<T>, milliseconds: number, caller?: AbortSignal): Promise<T> {
  if (!Number.isInteger(milliseconds) || milliseconds < 1 || milliseconds > 10_000) throw new RangeError("Invalid provider deadline");
  caller?.throwIfAborted();
  const deadline = new AbortController(), signal = caller ? AbortSignal.any([caller, deadline.signal]) : deadline.signal;
  const timer = setTimeout(() => deadline.abort(), milliseconds);
  let onAbort: (() => void) | undefined;
  try {
    const cancelled = new Promise<never>((_, reject) => { onAbort = () => reject(new ProviderDeadline()); signal.addEventListener("abort", onAbort, { once: true }); });
    return await Promise.race([operation(signal), cancelled]);
  } finally { clearTimeout(timer); if (onAbort) signal.removeEventListener("abort", onAbort); }
}
function attempted(error: unknown): number | null {
  if (typeof error === "object" && error !== null && "requests_attempted" in error && (error.requests_attempted === 0 || error.requests_attempted === 1)) return error.requests_attempted;
  return null;
}
function providerFailure(error: unknown, kind: "DISCOVERY" | "AI"): string {
  if (error instanceof ProviderDeadline) return `${kind}_TIMEOUT_FALLBACK`;
  if (typeof error === "object" && error !== null && "reason" in error && error.reason === "quota") return `${kind}_QUOTA_FALLBACK`;
  return `${kind}_UNAVAILABLE_FALLBACK`;
}
function stopFromPlace(place: DiscoveryPlace, required: boolean, destination: TripDraft["destination_slug"]): TripStop {
  const editorial = place.coordinate_source.provider === "openstreetmap" || place.coordinate_source.provider === "editorial";
  return { id: place.id, destination_slug: destination, user_title: place.title_vi, ...(editorial ? { catalog_place_id: place.id } : { provider_place_id: `community:${place.id}` }),
    location: { ...place.location }, coordinate_provenance: editorial ? "editorial" : "user_entered", requested_duration_min: place.suggested_duration_min!, is_required: required,
    hours: structuredClone(place.hours), transport_constraint: place.transport_constraint, cost_estimate: { provenance: "unknown" } };
}

/** Stateless candidate only. Reused online/offline; all side effects are injected ports. */
export async function generateHybridPreview(input: TripDraft, preferences: Partial<DiscoveryPreferences>, context: HybridContext, signal?: AbortSignal): Promise<HybridPreview> {
  signal?.throwIfAborted();
  const draft = structuredClone(input), snapshotPreferences = structuredClone(preferences);
  if (draft.planning_mode !== "assisted") throw new RangeError("MANUAL_MODE_REQUIRES_VALIDATION");
  // Validate before any external call; original input and selected metadata remain immutable.
  const initialPool=prepareRecommendations(draft, context.catalog, snapshotPreferences);
  const now = context.clock.now().getTime(), clock: Clock = { now: () => new Date(now) };
  if (!Number.isFinite(now) || !Number.isSafeInteger(context.seed) || !context.plan_run_id) throw new RangeError("Invalid hybrid context");
  const catalog = [...structuredClone(context.catalog)], warnings = new Set<string>(["CATALOG_DRAFTS_UNVERIFIED", "CANDIDATE_REQUIRES_CONFIRMATION"]);
  let externalConfirmationCount = 0;
  let discoveryAttempts: number | null = 0, rankingAttempts: number | null = 0;
  if (context.use_discovery && catalog.length >= 130) warnings.add("DISCOVERY_WINDOW_LIMITED");
  else if (context.use_discovery) {
    if (!context.discovery) warnings.add("DISCOVERY_DISABLED_CATALOG_FALLBACK");
    else try {
      const count = Math.min(100,130-catalog.length);
      const interests=initialPool.ranking_preferences.interests;
      const result = await bounded(signal => context.discovery!.search({ destination_slug: draft.destination_slug, city_name: findDestination(draft.destination_slug)!.name, query: "", ...(interests.length===1?{category:interests[0]}:{}), center: getCityGeo(draft.destination_slug).center, count }, signal), context.discovery_timeout_ms ?? 1800, signal);
      if (result.places.length > count || (result.requests_attempted !== 0 && result.requests_attempted !== 1)) throw new Error("Invalid discovery window");
      discoveryAttempts = result.requests_attempted;
      const transient:DiscoveryPlace[]=[];
      for (const place of result.places) {
        if ([place.coordinate_source,...place.sources].some(source=>source.retention==="request_only" || source.provider==="brave" || source.provider==="google")) transient.push(place);
        else catalog.push(place);
      }
      const visible=filterDiscovery(transient,{destination_slug:draft.destination_slug,query:"",category:"all",zone:snapshotPreferences.zone??"all",page:0,page_size:20,use_provider:true,max_distance_km:snapshotPreferences.max_distance_km},getCityGeo(draft.destination_slug)).filter(place=>!interests.length || place.categories.some(category=>interests.includes(category)));
      externalConfirmationCount=visible.length;context.on_transient_discovery?.(visible);
      if (result.window_limited) warnings.add("DISCOVERY_WINDOW_LIMITED");
    } catch (error) { signal?.throwIfAborted(); discoveryAttempts = attempted(error); warnings.add(providerFailure(error, "DISCOVERY")); }
  }
  const pool = prepareRecommendations(draft, catalog, snapshotPreferences); pool.warnings.forEach(warning => warnings.add(warning));
  let ordered = pool.ranked.map(candidate => candidate.place.id), rankingSource: HybridPreview["ranking_source"] = "deterministic";
  if (context.use_ai && pool.additional_count > 0 && pool.ranked.length > 1) {
    if (!context.ranker) warnings.add("AI_DISABLED_DETERMINISTIC_FALLBACK");
    else try {
      rankingAttempts = null;
      const ranked = await bounded(signal => context.ranker!.rank(pool.ranking_preferences, pool.ranked.map(candidate => ({ id: candidate.place.id, categories: candidate.place.categories, distance_from_center_km: candidate.distance_from_center_km, is_required: false, retention: candidate.place.coordinate_source.retention === "user_owned" ? "user_owned" : "open_license" })), signal), context.ranking_timeout_ms ?? 4500, signal);
      if (ranked.usage.requests_attempted !== 0 && ranked.usage.requests_attempted !== 1) throw new Error("Invalid ranking usage");
      rankingAttempts = ranked.usage.requests_attempted;
      const rankedIds = ranked.ordered.map(candidate => candidate.id);
      selectRecommendations(pool, rankedIds); ordered = rankedIds; rankingSource = ranked.usage.requests_attempted ? "groq" : "deterministic";
    } catch (error) { signal?.throwIfAborted(); rankingAttempts = attempted(error) ?? rankingAttempts; warnings.add(providerFailure(error, "AI")); }
  }
  const suggestions = selectRecommendations(pool, ordered), requiredIds = new Set(pool.required_places.map(place => place.id));
  const candidateDraft: TripDraft = { ...draft, stops: [...pool.selected_stops, ...suggestions.map(place => stopFromPlace(place, requiredIds.has(place.id), draft.destination_slug))] };
  const matrix = await new BoundedRoutingProvider(context.routing, context.routing_timeout_ms ?? 1500).estimateMatrix(routingInputForDraft(candidateDraft), signal);
  const permittedWarnings = new Set(["APPROXIMATE_NOT_ROAD_ETA", "LAND_ACCESS_NOT_ESTABLISHED", "PROVIDER_UNAVAILABLE", "PROVIDER_USAGE_UNKNOWN"]);
  const safeMatrix = { ...matrix, warnings: [...new Set(matrix.warnings.map(warning => permittedWarnings.has(warning) ? warning : "ROUTING_WARNING_REDACTED"))] };
  const planning = generatePlan(candidateDraft, safeMatrix, { clock, seed: context.seed, plan_run_id: context.plan_run_id });
  verifyPlanningResult(candidateDraft, planning, safeMatrix, clock);
  if (externalConfirmationCount || pool.filtered.some(candidate => candidate.reason === "SOURCE_REQUIRES_CONFIRMATION")) warnings.add("EXTERNAL_PLACES_REQUIRE_INDEPENDENT_CONFIRMATION");
  if (planning.status === "candidate") planning.candidate.warnings.forEach(warning => warnings.add(warning));
  if (discoveryAttempts === null || rankingAttempts === null) warnings.add("PROVIDER_USAGE_UNKNOWN");
  return { preview_only: true, requires_confirmation: true, empty: candidateDraft.stops.length === 0, candidate_draft: candidateDraft, planning, original_stop_ids: draft.stops.map(stop => stop.id), suggested_places: suggestions, external_confirmation_count: externalConfirmationCount,
    // Request-only provider identities/facts never enter a durable candidate or exportable diagnostics.
    filtered_candidates: pool.filtered.filter(candidate => candidate.reason !== "SOURCE_REQUIRES_CONFIRMATION"), duplicates_removed: pool.duplicates_removed,
    warnings: [...warnings].sort(), ranking_source: rankingSource, usage: { discovery_requests_attempted: discoveryAttempts, ranking_requests_attempted: rankingAttempts, matrix_elements_requested: matrix.elements_requested } };
}
