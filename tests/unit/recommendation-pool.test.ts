import { expect, test } from "vitest";
import { discoveryPreferences, prepareRecommendations, selectRecommendations } from "@/domain/discovery/recommendations";
import { discoveryPreferencesSchema } from "@/lib/validation/discovery-preferences";
import type { DiscoveryPlace } from "@/domain/discovery/place";
import { editorialDiscoveryCatalogs } from "@/adapters/discovery/editorial.server";
import { plannerDraft, plannerStop } from "../fixtures/planner";

const nhaTrang = editorialDiscoveryCatalogs["nha-trang"], daLat = editorialDiscoveryCatalogs["da-lat"];
const id = (index: number) => `f7100000-0000-4000-8000-${String(index).padStart(12, "0")}`;
function place(index: number, changes: Partial<DiscoveryPlace> = {}): DiscoveryPlace {
  const source = { ...nhaTrang[0].coordinate_source, provider_id: `node/${index + 1_000_000}`, url: `https://www.openstreetmap.org/node/${index + 1_000_000}` };
  return { ...nhaTrang[0], id: id(index), title_vi: `Synthetic original fixture ${index}`, categories: [index % 2 ? "nature" : "landmarks"], location: { lat: 12.245 + index / 10000, lng: 109.194 }, coordinate_source: source, sources: [source], suggested_duration_min: 60, transport_constraint: "access_unverified", ...changes };
}
const fixtures = Array.from({ length: 40 }, (_, index) => place(index));

test("optional defaults match public schema, and invalid/unknown/prototype preferences fail clearly", () => {
  expect(discoveryPreferences()).toEqual(discoveryPreferencesSchema.parse({}));
  for (const invalid of [{ interests: ["constructor"] }, { zone: "constructor" }, { max_suggestions: 31 }, { max_distance_km: NaN }, { max_distance_km: -1 }, { auto_suggest: "true" }, { required_place_ids: [id(1), id(1)] }, { food_preference: "verified_vegan" }, { injected: true }]) {
    expect(() => discoveryPreferences(invalid as never)).toThrow("INVALID_PREFERENCES");
  }
});
test.each([0, 1, 2, 10, 30])("%i original selections preserve identity/order/required/locks while known suggestions fill only available target", count => {
  const stops = fixtures.slice(0, count).map((item, index) => plannerStop(item.id, { catalog_place_id: item.id, user_title: item.title_vi, location: item.location, is_required: index % 2 === 0, ...(index === 0 ? { lock: { plan_date: "2026-11-06", start_local: "11:00", sort_index: 0 } } : {}) }));
  const draft = plannerDraft({ stops }), before = structuredClone({ draft, fixtures });
  const pool = prepareRecommendations(draft, fixtures), suggestions = selectRecommendations(pool);
  expect(pool.selected_stops).toEqual(stops); expect(suggestions.length).toBe(Math.max(0, 9 - count));
  if(count===0) { expect(pool.filtered.filter(item=>item.reason==="RANKING_WINDOW_LIMIT")).toHaveLength(10); expect(pool.warnings).toContain("RECOMMENDATION_WINDOW_LIMITED"); }
  expect(pool.ranked.length).toBeLessThanOrEqual(30); expect(suggestions.every(candidate => !stops.some(stop => stop.id === candidate.id))).toBe(true);
  expect(new Set([...stops, ...suggestions].map(candidate => candidate.id)).size).toBe(stops.length + suggestions.length);
  expect({ draft, fixtures }).toEqual(before);
});
test.each([1, 2, 3, 4, 5, 6, 7])("%i-day discovery has a deterministic pace target and remains valid with short first/last days", days => {
  const draft = plannerDraft({ end_date: `2026-11-${String(5 + days).padStart(2, "0")}`, pace: "active" });
  const first = prepareRecommendations(draft, fixtures), again = prepareRecommendations(draft, [...fixtures].reverse());
  expect(first.ranked.map(candidate => candidate.place.id)).toEqual(again.ranked.map(candidate => candidate.place.id));
  expect(selectRecommendations(first)).toHaveLength(days * 4); expect(first.ranking_preferences.day_count).toBe(days);
});
test("real two-city catalogs stay distinct, preserve all source facts and never create invented places", () => {
  const all = [...nhaTrang, ...daLat], before = structuredClone(all);
  for (const [city, catalog] of [["nha-trang", nhaTrang], ["da-lat", daLat]] as const) {
    const pool = prepareRecommendations(plannerDraft({ destination_slug: city }), all);
    expect(pool.ranked.every(candidate => candidate.place.destination_slug === city)).toBe(true);
    expect(pool.filtered.filter(candidate => candidate.reason === "OTHER_CITY")).toHaveLength(30);
    for (const suggestion of selectRecommendations(pool)) expect(catalog.find(candidate => candidate.id === suggestion.id)).toEqual(suggestion);
  }
  expect(all).toEqual(before);
});
test("interests/zone/explicit distance constrain suggestions, not original selected/required stops", () => {
  const near = place(1), far = place(2, { location: { lat: 12.7, lng: 109.2 } });
  const original = plannerStop(far.id, { catalog_place_id: far.id, location: far.location, is_required: true });
  const pool = prepareRecommendations(plannerDraft({ stops: [original] }), [near, far, place(3)], { interests: ["nature"], zone: "center", max_distance_km: 1 });
  expect(pool.selected_stops).toEqual([original]); expect(pool.warnings).toContain("SELECTED_OUTSIDE_DISCOVERY_FILTER");
  expect(selectRecommendations(pool).every(candidate => candidate.categories.includes("nature"))).toBe(true);
  const noMatches = prepareRecommendations(plannerDraft(), fixtures, { interests: ["food"] }); expect(selectRecommendations(noMatches)).toEqual([]); expect(noMatches.warnings).toContain("NO_MATCHING_KNOWN_CANDIDATES");
  const radiusZero = prepareRecommendations(plannerDraft(), [near], { max_distance_km: 0 }); expect(radiusZero.filtered).toEqual([{ id: near.id, reason: "OUTSIDE_TOLERANCE" }]);
});
test("requested required identities are retained outside soft filters, and contradictory/unknown/too-many requirements are explicit errors", () => {
  const required = place(2, { transport_constraint: "manual_transfer", location: { lat: 12.7, lng: 109.2 } });
  const pool = prepareRecommendations(plannerDraft(), [required], { required_place_ids: [required.id], interests: ["food"], zone: "center", max_distance_km: 0, auto_suggest: false });
  expect(selectRecommendations(pool)).toEqual([required]); expect(pool.warnings).toContain("REQUIRED_OUTSIDE_DISCOVERY_FILTER");
  const selected = plannerStop("existing-manual", { catalog_place_id: required.id });
  expect(prepareRecommendations(plannerDraft({ stops: [selected] }), [required], { required_place_ids: [required.id] }).selected_stops[0].is_required).toBe(true);
  expect(() => prepareRecommendations(plannerDraft({ stops: [selected] }), [required], { excluded_place_ids: [required.id] })).toThrow("SELECTED_EXCLUDED_CONFLICT");
  expect(() => prepareRecommendations(plannerDraft(), [required], { required_place_ids: [id(999)] })).toThrow("UNKNOWN_REQUIRED_PLACE");
  expect(() => prepareRecommendations(plannerDraft(), [required], { required_place_ids: [required.id], excluded_place_ids: [required.id] })).toThrow("SELECTED_EXCLUDED_CONFLICT");
  expect(() => prepareRecommendations(plannerDraft({ stops: Array.from({ length: 30 }, (_, index) => plannerStop(`manual-${index}`)) }), [required], { required_place_ids: [required.id] })).toThrow("TOO_MANY_REQUIRED_PLACES");
});
test("provider rights, unreviewed user data, lodging/services/manual transfer, invalid locations and unknown duration are explained", () => {
  const userSource = { ...fixtures[0].coordinate_source, provider: "user" as const, retention: "user_owned" as const };
  const restricted = { ...fixtures[0].coordinate_source, provider: "brave" as const, retention: "request_only" as const };
  const examples = [
    place(1, { categories: ["lodging"] }), place(2, { categories: ["services"] }), place(3, { transport_constraint: "manual_transfer" }), place(4, { suggested_duration_min: null }),
    place(5, { coordinate_source: restricted, sources: [restricted] }), place(6, { coordinate_source: userSource, sources: [userSource], moderation: "submitted" }), place(7, { location: { lat: NaN, lng: 0 } }),
  ];
  const pool = prepareRecommendations(plannerDraft(), examples);
  expect(selectRecommendations(pool)).toEqual([]);
  expect(pool.filtered.map(item => item.reason).sort()).toEqual(["NOT_A_VISIT", "NOT_A_VISIT", "MANUAL_TRANSFER_REQUIRED", "DURATION_UNKNOWN", "SOURCE_REQUIRES_CONFIRMATION", "UNREVIEWED_CONTRIBUTION", "INVALID_LOCATION"].sort());
  expect(() => prepareRecommendations(plannerDraft(), [examples[4]], { required_place_ids: [examples[4].id] })).toThrow("REQUIRED_NEEDS_CONFIRMATION");
  const approved = place(8, { coordinate_source: userSource, sources: [userSource], moderation: "approved" });
  expect(selectRecommendations(prepareRecommendations(plannerDraft(), [approved]))).toEqual([approved]);
});
test("duplicates never replace selected identity or auto-add a suspected same-name manual stop", () => {
  const original = place(1), duplicate = { ...original, id: id(2) };
  const selected = plannerStop(duplicate.id, { catalog_place_id: duplicate.id, user_title: duplicate.title_vi, location: duplicate.location });
  const pool = prepareRecommendations(plannerDraft({ stops: [selected] }), [original, duplicate]); expect(pool.selected_stops).toEqual([selected]); expect(selectRecommendations(pool)).toEqual([]); expect(pool.duplicates_removed).toBe(1);
  const manual = plannerStop("manual-only", { user_title: original.title_vi, location: original.location });
  const suspected = prepareRecommendations(plannerDraft({ stops: [manual] }), [original]); expect(suspected.filtered).toEqual([{ id: original.id, reason: "DUPLICATE_REQUIRES_CONFIRMATION" }]);
  const conflicting = { ...original, id: id(3), title_vi: "Contradictory source title" };
  expect(prepareRecommendations(plannerDraft(), [original, conflicting]).ranked).toEqual([]);
});
test("bounded AI ordering selects only known suggestions; partial, duplicate or invented IDs cannot drop required additions", () => {
  const required = fixtures[0], pool = prepareRecommendations(plannerDraft(), fixtures.slice(0, 12), { required_place_ids: [required.id], max_suggestions: 2 });
  const reversed = pool.ranked.map(item => item.place.id).reverse(), selected = selectRecommendations(pool, reversed);
  expect(selected.map(item => item.id)).toEqual([required.id, ...reversed.slice(0, 2)]);
  for (const bad of [reversed.slice(1), [...reversed.slice(1), "invented"], reversed.map(() => reversed[0])]) expect(() => selectRecommendations(pool, bad)).toThrow("INVALID_RANKING");
});
test("manual/explicit-off/zero-suggestion modes retain selected stops and soft preferences do not imply verified facts", () => {
  const stop = plannerStop("chosen", { is_required: true }), draft = plannerDraft({ stops: [stop] });
  for (const partial of [{ auto_suggest: false }, { max_suggestions: 0 }]) expect(selectRecommendations(prepareRecommendations(draft, fixtures, partial))).toEqual([]);
  expect(selectRecommendations(prepareRecommendations({ ...draft, planning_mode: "manual" }, fixtures))).toEqual([]);
  const pool = prepareRecommendations(draft, fixtures, { food_preference: "vegan", accommodation_preference: "homestay", time_of_day: "morning" });
  expect(pool.warnings).toEqual(expect.arrayContaining(["FOOD_SUITABILITY_UNVERIFIED", "ACCOMMODATION_NOT_BOOKED", "TIME_OF_DAY_SOFT_PREFERENCE"]));
  expect(pool.selected_stops).toEqual([stop]); expect(pool.ranking_preferences.budget_band).toBe("unspecified");
  expect(() => prepareRecommendations(plannerDraft({ end_date: "2026-11-99" }), fixtures)).toThrow("INVALID_DRAFT");
});
