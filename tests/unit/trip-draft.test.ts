import { expect, test } from "vitest";
import { localTripDates, draftIssues } from "@/domain/trip-draft";
import type { TripDraft } from "@/domain/model/trip";

const draft: TripDraft = { id: "draft", version: 1, title: "Chuyến đi", destination_slug: "da-lat", timezone: "Asia/Ho_Chi_Minh", start_date: "2026-11-10", end_date: "2026-11-12", arrival_local_time: "10:00", departure_local_time: "16:00", base_location: { label: "Nơi ở", lat: 11.94, lng: 108.44, temporary: true }, party_size: 2, transport_mode: "motorbike", pace: "balanced", planning_mode: "manual", budget: { currency: "VND", total_vnd: null, known_costs_vnd: { lodging: 0, transport: 0, meals: 0, other: 0 } }, preferences: { day_start: "08:00", day_end: "21:00", lunch_buffer_minutes: 60, rest_buffer_minutes: 15, return_to_base: true }, stops: [] };
test("date enumeration is local-calendar only, strict and bounded", () => {
  expect(localTripDates("2026-11-06", "2026-11-08")).toEqual(["2026-11-06", "2026-11-07", "2026-11-08"]);
  expect(localTripDates("2028-02-28", "2028-03-01")).toEqual(["2028-02-28", "2028-02-29", "2028-03-01"]);
  for (const [start, end] of [["2026-02-29", "2026-03-01"], ["2026-11-12", "2026-11-10"], ["2026-11-01", "2026-11-08"], ["", ""], ["2026-2-1", "2026-02-02"]]) expect(localTripDates(start, end)).toEqual([]);
});
test("draft validation preserves null budget, manual mode and all fields without mutation", () => {
  const before = structuredClone(draft);
  expect(draftIssues(draft)).toEqual([]);
  expect(draftIssues({ ...draft, budget: { ...draft.budget, total_vnd: 0 } })).toEqual([]);
  expect(draft).toEqual(before);
});
test.each([
  { arrival_local_time: "24:00" }, { start_date: "2026-02-30" }, { timezone: "UTC" }, { party_size: 31 },
  { base_location: { ...draft.base_location, lat: NaN } }, { base_location: { ...draft.base_location, lng: 181 } },
  { start_date: "2026-11-10", end_date: "2026-11-10", arrival_local_time: "17:00", departure_local_time: "16:00" },
  { budget: { ...draft.budget, total_vnd: -1 } },
  { title: "x".repeat(121) },
  { preferences: { ...draft.preferences, lunch_buffer_minutes: 181 } },
  { preferences: { ...draft.preferences, rest_buffer_minutes: 181 } },
])("rejects invalid accurate-draft inputs: %j", (invalid) => {
  expect(draftIssues({ ...draft, ...invalid })).not.toEqual([]);
});

test("cross-city/duplicate stops are rejected while required selection order is retained", () => {
  const one = { id: "one", catalog_place_id: "catalog-one", destination_slug: "da-lat" as const, user_title: "Một", location: { lat: 11.94, lng: 108.44 }, coordinate_provenance: "editorial" as const, requested_duration_min: 60, is_required: true, hours: { state: "hours_unknown" as const }, transport_constraint: "access_unverified" as const, cost_estimate: { provenance: "unknown" as const } };
  const input = { ...draft, stops: [one, { ...one, id: "two", catalog_place_id: "catalog-two", is_required: false }] };
  const before = structuredClone(input);
  expect(draftIssues(input)).toEqual([]);
  expect(input).toEqual(before);
  expect(draftIssues({ ...draft, stops: [one, { ...one, id: "two" }] })).toContain("DUPLICATE_PLACE");
  expect(draftIssues({ ...draft, stops: [{ ...one, destination_slug: "nha-trang" }] })).toContain("STOP_INPUT");
  expect(draftIssues({ ...draft, stops: Array.from({ length: 31 }, (_, index) => ({ ...one, id: String(index), catalog_place_id: String(index) })) })).toContain("STOP_COUNT_OR_IDENTITY");
});
