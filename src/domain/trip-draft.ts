import { summarizeTripBudget } from "./budget";
import { findDestination } from "./model/destination";
import type { Coordinates, TripDraft } from "./model/trip";

export function localTripDates(start: string, end: string): string[] {
  const ordinal = (date: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN;
    const value = Date.parse(`${date}T00:00:00.000Z`);
    return Number.isFinite(value) && new Date(value).toISOString().slice(0, 10) === date ? value : NaN;
  };
  const first = ordinal(start), last = ordinal(end);
  const length = (last - first) / 86_400_000 + 1;
  if (!Number.isInteger(length) || length < 1 || length > 7) return [];
  return Array.from({ length }, (_, index) => new Date(first + index * 86_400_000).toISOString().slice(0, 10));
}

export function validCoordinates(location: Coordinates): boolean {
  return Number.isFinite(location.lat) && location.lat >= -90 && location.lat <= 90 && Number.isFinite(location.lng) && location.lng >= -180 && location.lng <= 180;
}

const localTime = (value: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

/** Validates typed draft inputs; public JSON still requires a server-side schema. */
export function draftIssues(draft: TripDraft): string[] {
  const issues: string[] = [];
  const dates = localTripDates(draft.start_date, draft.end_date);
  if (!dates.length) issues.push("DATES");
  if (!localTime(draft.arrival_local_time) || !localTime(draft.departure_local_time) || (dates.length === 1 && draft.arrival_local_time >= draft.departure_local_time)) issues.push("EDGE_TIMES");
  if (findDestination(draft.destination_slug)?.timezone !== draft.timezone) issues.push("DESTINATION_TIMEZONE");
  if (!draft.title.trim() || draft.title.length > 200 || !draft.base_location.label.trim() || draft.base_location.label.length > 200 || !validCoordinates(draft.base_location)) issues.push("BASE_OR_TITLE");
  if (!localTime(draft.preferences.day_start) || !localTime(draft.preferences.day_end) || draft.preferences.day_start >= draft.preferences.day_end || [draft.preferences.lunch_buffer_minutes, draft.preferences.rest_buffer_minutes].some((value) => !Number.isInteger(value) || value < 0 || value > 1440)) issues.push("PREFERENCES");
  if (!["walk", "motorbike", "drive"].includes(draft.transport_mode) || !["relaxed", "balanced", "active"].includes(draft.pace) || !["assisted", "manual"].includes(draft.planning_mode)) issues.push("MODE");
  if (draft.stops.length > 30 || new Set(draft.stops.map((stop) => stop.id)).size !== draft.stops.length) issues.push("STOP_COUNT_OR_IDENTITY");
  const catalogIds = draft.stops.flatMap((stop) => stop.catalog_place_id ? [stop.catalog_place_id] : []);
  const providerIds = draft.stops.flatMap((stop) => stop.provider_place_id ? [stop.provider_place_id] : []);
  if (new Set(catalogIds).size !== catalogIds.length || new Set(providerIds).size !== providerIds.length) issues.push("DUPLICATE_PLACE");
  for (const stop of draft.stops) {
    if (!stop.id || !stop.user_title.trim() || stop.destination_slug !== draft.destination_slug || !validCoordinates(stop.location) || !Number.isInteger(stop.requested_duration_min) || stop.requested_duration_min < 15 || stop.requested_duration_min > 720) issues.push("STOP_INPUT");
    if (stop.lock && (!dates.includes(stop.lock.plan_date) || !localTime(stop.lock.start_local) || !Number.isInteger(stop.lock.sort_index) || stop.lock.sort_index < 0)) issues.push("LOCK_INPUT");
  }
  try { summarizeTripBudget(draft.budget, draft.party_size, dates.length, draft.stops.map((stop) => stop.cost_estimate)); }
  catch { issues.push("PARTY_OR_BUDGET"); }
  return [...new Set(issues)];
}
