import type { DestinationSlug } from "./destination";

export type Coordinates = Readonly<{ lat: number; lng: number }>;
export type TransportMode = "walk" | "motorbike" | "drive";
export type Pace = "relaxed" | "balanced" | "active";
export type PlanningMode = "assisted" | "manual";
export type CostProvenance = "user_entered" | "unknown";
export type CostEstimate =
  | Readonly<{ provenance: "unknown" }>
  | Readonly<{ provenance: "user_entered"; amount_vnd: number; applies_to: "group" | "per_person" }>;
export type TripBudget = Readonly<{
  currency: "VND";
  total_vnd: number | null;
  known_costs_vnd: Readonly<{ lodging: number; transport: number; meals: number; other: number }>;
}>;
export type EstimateSource = "approximate" | "google_routes";
export type UnscheduledReason = "CLOSED" | "TIME_WINDOW" | "TRAVEL_TOO_LONG" | "CAPACITY" | "UNREACHABLE" | "DUPLICATE" | "OUT_OF_AREA" | "LOCK_CONFLICT" | "UNKNOWN";
export type OpeningHours =
  | Readonly<{ state: "hours_unknown" }>
  | Readonly<{ state: "verified_editorial"; checked_at: string; source: string; intervals: readonly { weekday: number; start_local: string; end_local: string }[] }>;

export interface TripStop {
  readonly id: string;
  readonly catalog_place_id?: string;
  readonly provider_place_id?: string;
  readonly destination_slug: DestinationSlug;
  readonly user_title: string;
  readonly location: Coordinates;
  readonly coordinate_provenance: "editorial" | "user_entered";
  readonly requested_duration_min: number;
  readonly is_required: boolean;
  readonly hours: OpeningHours;
  readonly lock?: Readonly<{ plan_date: string; start_local: string; sort_index: number }>;
  readonly transport_constraint: "land" | "manual_transfer" | "access_unverified";
  readonly cost_estimate: CostEstimate;
}

export interface TripDraft {
  readonly id: string;
  readonly version: number;
  readonly destination_slug: DestinationSlug;
  readonly title: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly timezone: string;
  readonly arrival_local_time: string;
  readonly departure_local_time: string;
  readonly base_location: Coordinates & Readonly<{ label: string; temporary: boolean }>;
  readonly transport_mode: TransportMode;
  readonly pace: Pace;
  readonly party_size: number;
  readonly planning_mode: PlanningMode;
  readonly budget: TripBudget;
  readonly preferences: Readonly<{ day_start: string; day_end: string; lunch_buffer_minutes: number; rest_buffer_minutes: number; return_to_base: boolean }>;
  readonly stops: readonly TripStop[];
}

export interface ScheduledStop {
  readonly stop_id: string;
  readonly start_local: string;
  readonly end_local: string;
  readonly travel_from_previous_minutes: number;
  readonly estimate_source: EstimateSource;
  readonly warnings: readonly string[];
}

export interface PlanCandidate {
  readonly plan_run_id: string;
  readonly input_version: number;
  readonly engine_version: string;
  readonly seed: number;
  readonly days: readonly { date: string; stops: readonly ScheduledStop[] }[];
  readonly unscheduled: readonly { stop_id: string; reason: UnscheduledReason; message: string }[];
  readonly warnings: readonly string[];
}
