import type { TripDraft, TripStop } from "@/domain/model/trip";
import type { Clock } from "@/domain/ports/providers";

export const fixedClock: Clock = { now: () => new Date("2026-10-28T00:00:00Z") };
export function plannerStop(id: string, overrides: Partial<TripStop> = {}): TripStop {
  return { id, destination_slug: "nha-trang", user_title: id, location: { lat: 12.25, lng: 109.19 }, coordinate_provenance: "user_entered", requested_duration_min: 60, is_required: false, hours: { state: "hours_unknown" }, transport_constraint: "land", cost_estimate: { provenance: "unknown" }, ...overrides };
}
export function plannerDraft(overrides: Partial<TripDraft> = {}): TripDraft {
  return { id: "synthetic-trip", version: 1, title: "Synthetic fixture only", destination_slug: "nha-trang", timezone: "Asia/Ho_Chi_Minh", start_date: "2026-11-06", end_date: "2026-11-08", arrival_local_time: "10:30", departure_local_time: "16:00", base_location: { label: "Synthetic base", lat: 12.24, lng: 109.19, temporary: false }, transport_mode: "motorbike", pace: "balanced", party_size: 2, planning_mode: "assisted", budget: { currency: "VND", total_vnd: null, known_costs_vnd: { lodging: 0, transport: 0, meals: 0, other: 0 } }, preferences: { day_start: "08:00", day_end: "21:00", lunch_buffer_minutes: 60, rest_buffer_minutes: 15, return_to_base: true }, stops: [], ...overrides };
}
