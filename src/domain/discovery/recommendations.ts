import type { TripDraft, TripStop } from "../model/trip";
import type { RankingPreferences } from "../ports/recommendations";
import { draftIssues, localTripDates, validCoordinates } from "../trip-draft";
import { haversineKm } from "../routing/matrix";
import { getCityGeo } from "./cities";
import { classifyGeo, geoZoneLabels, type GeoZone } from "./geo";
import { deduplicateDiscovery } from "./dedup";
import { isVisitCandidate, normalizePlaceText, placeCategories, type DiscoveryPlace, type PlaceCategory } from "./place";

export interface DiscoveryPreferences {
  readonly interests: readonly PlaceCategory[]; readonly required_place_ids: readonly string[]; readonly excluded_place_ids: readonly string[];
  readonly zone: GeoZone | "all"; readonly max_distance_km?: number; readonly max_suggestions?: number; readonly auto_suggest: boolean;
  readonly food_preference: RankingPreferences["food_preference"]; readonly accommodation_preference: RankingPreferences["accommodation_preference"]; readonly time_of_day: RankingPreferences["time_of_day"];
}
export class RecommendationInputError extends RangeError {
  constructor(readonly code: "INVALID_PREFERENCES" | "INVALID_DRAFT" | "SELECTED_EXCLUDED_CONFLICT" | "UNKNOWN_REQUIRED_PLACE" | "REQUIRED_NEEDS_CONFIRMATION" | "TOO_MANY_REQUIRED_PLACES" | "INVALID_RANKING") { super(code); }
}
export function discoveryPreferences(input: Partial<DiscoveryPreferences> = {}): DiscoveryPreferences {
  const preferences: DiscoveryPreferences = { interests: [], required_place_ids: [], excluded_place_ids: [], zone: "all", auto_suggest: true, food_preference: "any", accommodation_preference: "any", time_of_day: "any", ...input };
  const keys = ["interests", "required_place_ids", "excluded_place_ids", "zone", "max_distance_km", "max_suggestions", "auto_suggest", "food_preference", "accommodation_preference", "time_of_day"];
  const strings = (value: readonly string[], max: number) => Array.isArray(value) && value.length <= max && new Set(value).size === value.length && value.every(item => typeof item === "string" && item.length > 0 && item.length <= 140);
  if (Object.keys(input).some(key => !keys.includes(key)) || !strings(preferences.interests, 10) || preferences.interests.some(category => !Object.hasOwn(placeCategories, category))
    || !strings(preferences.required_place_ids, 30) || !strings(preferences.excluded_place_ids, 130) || (preferences.zone !== "all" && !Object.hasOwn(geoZoneLabels, preferences.zone))
    || typeof preferences.auto_suggest !== "boolean" || (preferences.max_distance_km !== undefined && (!Number.isFinite(preferences.max_distance_km) || preferences.max_distance_km < 0 || preferences.max_distance_km > 150))
    || (preferences.max_suggestions !== undefined && (!Number.isInteger(preferences.max_suggestions) || preferences.max_suggestions < 0 || preferences.max_suggestions > 30))
    || !["any", "vegetarian", "vegan", "seafood", "local_food"].includes(preferences.food_preference) || !["any", "hotel", "resort", "homestay", "hostel", "villa"].includes(preferences.accommodation_preference) || !["any", "morning", "afternoon", "evening"].includes(preferences.time_of_day)) throw new RecommendationInputError("INVALID_PREFERENCES");
  return { ...preferences, interests: [...preferences.interests], required_place_ids: [...preferences.required_place_ids], excluded_place_ids: [...preferences.excluded_place_ids] };
}
export type RecommendationExclusion = "INVALID_LOCATION" | "OTHER_CITY" | "NOT_A_VISIT" | "SOURCE_REQUIRES_CONFIRMATION" | "UNREVIEWED_CONTRIBUTION" | "DUPLICATE_REQUIRES_CONFIRMATION" | "DURATION_UNKNOWN" | "USER_EXCLUDED" | "INTEREST_MISMATCH" | "OUTSIDE_ZONE" | "OUTSIDE_TOLERANCE" | "MANUAL_TRANSFER_REQUIRED" | "RANKING_WINDOW_LIMIT";
export interface RankedPlace { readonly place: DiscoveryPlace; readonly score: number; readonly distance_from_center_km: number }
export interface RecommendationPool {
  readonly selected_stops: readonly TripStop[]; readonly required_places: readonly DiscoveryPlace[]; readonly ranked: readonly RankedPlace[];
  readonly additional_count: number; readonly filtered: readonly { readonly id: string; readonly reason: RecommendationExclusion }[];
  readonly duplicate_matches: ReturnType<typeof deduplicateDiscovery>["matches"]; readonly duplicates_removed: number;
  readonly warnings: readonly string[]; readonly ranking_preferences: RankingPreferences;
}
const compareId = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;

/** Filters constrain new suggestions only. Original selections/locks never disappear. */
export function prepareRecommendations(draft: TripDraft, input: readonly DiscoveryPlace[], partial: Partial<DiscoveryPreferences> = {}): RecommendationPool {
  if (draftIssues(draft).length) throw new RecommendationInputError("INVALID_DRAFT");
  if (input.length > 130) throw new RecommendationInputError("INVALID_PREFERENCES");
  const preferences = discoveryPreferences(partial), city = getCityGeo(draft.destination_slug), required = new Set(preferences.required_place_ids), excluded = new Set(preferences.excluded_place_ids);
  if (preferences.required_place_ids.some(id => excluded.has(id)) || draft.stops.some(stop => excluded.has(stop.id) || (!!stop.catalog_place_id && excluded.has(stop.catalog_place_id)))) throw new RecommendationInputError("SELECTED_EXCLUDED_CONFLICT");
  const selected = draft.stops.map(stop => ({ ...stop, is_required: stop.is_required || required.has(stop.id) || (!!stop.catalog_place_id && required.has(stop.catalog_place_id)) }));
  const chosen = new Set(selected.flatMap(stop => [stop.id, ...(stop.catalog_place_id ? [stop.catalog_place_id] : [])]));
  const filtered: { id: string; reason: RecommendationExclusion }[] = [], warnings = new Set<string>();
  const valid = input.filter(place => { if (validCoordinates(place.location)) return true; filtered.push({ id: place.id, reason: "INVALID_LOCATION" }); return false; });
  const dedup = deduplicateDiscovery(valid.sort((a,b)=>compareId(a.id,b.id))), confirmation = new Set(dedup.confirmation_ids);
  for (const match of dedup.matches) if (match.certainty === "certain" && (chosen.has(match.retained_id) || chosen.has(match.duplicate_id))) { chosen.add(match.retained_id); chosen.add(match.duplicate_id); }
  const days = localTripDates(draft.start_date, draft.end_date).length;
  const available = new Map<string, RankedPlace>(), requiredPlaces: DiscoveryPlace[] = [];
  function persistent(place: DiscoveryPlace): boolean {
    return place.sources.length > 0 && [place.coordinate_source, ...place.sources].every(source => source.provider !== "brave" && source.provider !== "google" && (source.retention === "open_license" || source.retention === "user_owned"));
  }
  function eligibility(place: DiscoveryPlace): RecommendationExclusion | null {
    if (place.destination_slug !== draft.destination_slug) return "OTHER_CITY";
    if (!isVisitCandidate(place)) return "NOT_A_VISIT";
    if (!persistent(place)) return "SOURCE_REQUIRES_CONFIRMATION";
    if ([place.coordinate_source, ...place.sources].some(source => source.provider === "user") && place.moderation !== "approved") return "UNREVIEWED_CONTRIBUTION";
    if (confirmation.has(place.id)) return "DUPLICATE_REQUIRES_CONFIRMATION";
    if (selected.some(stop => normalizePlaceText(stop.user_title) === normalizePlaceText(place.title_vi) && haversineKm(stop.location, place.location) <= 0.15)) return "DUPLICATE_REQUIRES_CONFIRMATION";
    if (place.suggested_duration_min === null || !Number.isInteger(place.suggested_duration_min) || place.suggested_duration_min < 15 || place.suggested_duration_min > 720) return "DURATION_UNKNOWN";
    return null;
  }
  function filterReason(place: DiscoveryPlace, distance: number): RecommendationExclusion | null {
    if (preferences.interests.length && !place.categories.some(category => preferences.interests.includes(category))) return "INTEREST_MISMATCH";
    if (preferences.zone !== "all" && classifyGeo(place.location, city, place.transport_constraint === "manual_transfer").zone !== preferences.zone) return "OUTSIDE_ZONE";
    if (preferences.max_distance_km !== undefined && distance > preferences.max_distance_km) return "OUTSIDE_TOLERANCE";
    return null;
  }
  for (const place of dedup.places) {
    const distance = haversineKm(city.center, place.location);
    if (chosen.has(place.id)) { if (filterReason(place, distance)) warnings.add("SELECTED_OUTSIDE_DISCOVERY_FILTER"); continue; }
    const invalid = eligibility(place);
    if (invalid) { filtered.push({ id: place.id, reason: invalid }); continue; }
    if (required.has(place.id)) { requiredPlaces.push(place); if (filterReason(place, distance)) warnings.add("REQUIRED_OUTSIDE_DISCOVERY_FILTER"); continue; }
    const reason = excluded.has(place.id) ? "USER_EXCLUDED" : place.transport_constraint === "manual_transfer" ? "MANUAL_TRANSFER_REQUIRED" : filterReason(place, distance);
    if (reason) { filtered.push({ id: place.id, reason }); continue; }
    const matches = place.categories.filter(category => preferences.interests.includes(category)).length;
    available.set(place.id, { place, distance_from_center_km: distance, score: matches * 100 - distance });
  }
  for (const id of required) {
    if (chosen.has(id) || requiredPlaces.some(place => place.id === id)) continue;
    if (!input.some(place => place.id === id)) throw new RecommendationInputError("UNKNOWN_REQUIRED_PLACE");
    throw new RecommendationInputError("REQUIRED_NEEDS_CONFIRMATION");
  }
  if (selected.length + requiredPlaces.length > 30) throw new RecommendationInputError("TOO_MANY_REQUIRED_PLACES");
  requiredPlaces.sort((a, b) => compareId(a.id, b.id));
  const ranked: RankedPlace[] = [], used = new Set(input.filter(place => chosen.has(place.id)).flatMap(place => place.categories).concat(requiredPlaces.flatMap(place => place.categories)));
  while (available.size && ranked.length < 30) {
    const score = (candidate: RankedPlace) => candidate.score + (candidate.place.categories.some(category => !used.has(category)) ? 15 : 0);
    const best = [...available.values()].sort((a, b) => score(b) - score(a) || compareId(a.place.id, b.place.id))[0];
    ranked.push(best); available.delete(best.place.id); best.place.categories.forEach(category => used.add(category));
  }
  if (available.size) { warnings.add("RECOMMENDATION_WINDOW_LIMITED"); for (const candidate of available.values()) filtered.push({ id: candidate.place.id, reason: "RANKING_WINDOW_LIMIT" }); }
  const capacity = days * ({ relaxed: 2, balanced: 3, active: 4 } as const)[draft.pace];
  const additionalCount = preferences.auto_suggest && draft.planning_mode === "assisted" ? Math.min(preferences.max_suggestions ?? 30, Math.max(0, capacity - selected.length - requiredPlaces.length), 30 - selected.length - requiredPlaces.length) : 0;
  if (additionalCount && !ranked.length) warnings.add("NO_MATCHING_KNOWN_CANDIDATES");
  if (preferences.food_preference !== "any") warnings.add("FOOD_SUITABILITY_UNVERIFIED");
  if (preferences.accommodation_preference !== "any") warnings.add("ACCOMMODATION_NOT_BOOKED");
  if (preferences.time_of_day !== "any") warnings.add("TIME_OF_DAY_SOFT_PREFERENCE");
  const perPersonDay = draft.budget.total_vnd === null ? null : draft.budget.total_vnd / draft.party_size / days;
  return { selected_stops: selected, required_places: requiredPlaces, ranked, additional_count: additionalCount, filtered, duplicate_matches: dedup.matches, duplicates_removed: dedup.removed, warnings: [...warnings].sort(), ranking_preferences: {
    day_count: days, party_size: draft.party_size, pace: draft.pace, transport_mode: draft.transport_mode, interests: preferences.interests,
    budget_band: perPersonDay === null ? "unspecified" : perPersonDay < 500_000 ? "economy" : perPersonDay < 1_500_000 ? "moderate" : "flexible",
    food_preference: preferences.food_preference, accommodation_preference: preferences.accommodation_preference, time_of_day: preferences.time_of_day,
  } };
}

/** AI can reorder only this bounded pool. Explicit required additions always come first. */
export function selectRecommendations(pool: RecommendationPool, orderedIds: readonly string[] = pool.ranked.map(candidate => candidate.place.id)): readonly DiscoveryPlace[] {
  const byId = new Map(pool.ranked.map(candidate => [candidate.place.id, candidate.place]));
  if (orderedIds.length !== byId.size || new Set(orderedIds).size !== byId.size || orderedIds.some(id => !byId.has(id))) throw new RecommendationInputError("INVALID_RANKING");
  return [...pool.required_places, ...orderedIds.slice(0, pool.additional_count).map(id => byId.get(id)!)];
}
