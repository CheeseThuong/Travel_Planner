import type { DestinationSlug } from "../model/destination";
import type { Coordinates, EstimateSource, TransportMode } from "../model/trip";

export type RouteCell = Readonly<{ status: "unreachable" }> | Readonly<{ status: "reachable"; duration_minutes: number; estimate_source: EstimateSource; uncertainty: "low" | "high" }>;
export interface MatrixInput { readonly nodes: readonly (Coordinates & { readonly id: string })[]; readonly transport_mode: TransportMode; readonly departure_at?: string }
export interface MatrixResult { readonly node_ids: readonly string[]; readonly cells: readonly (readonly RouteCell[])[]; readonly warnings: readonly string[]; readonly elements_requested: number }
export interface RoutingProvider { estimateMatrix(input: MatrixInput, signal?: AbortSignal): Promise<MatrixResult> }

export interface PlaceResolution {
  readonly status: "candidate_selection_required" | "manual_entry_required";
  readonly candidates: readonly { provider: "editorial" | "google"; provider_place_id?: string; display_name: string; location?: Coordinates; confidence: "low" | "medium" | "high" }[];
  readonly manual_entry_available: true;
}
export interface PlaceResolver { resolve(input: Readonly<{ url: string; destination_slug: DestinationSlug }>, signal?: AbortSignal): Promise<PlaceResolution> }
export interface Clock { now(): Date }
