import type { Coordinates } from "../model/trip";
import type { DiscoveryPlace, PlaceCategory } from "./place";
import type { GeoZone, classifyGeo } from "./geo";
import type { DuplicateMatch } from "./dedup";

export interface PlaceSearchRequest {
  readonly destination_slug: string;
  readonly city_name: string;
  readonly query: string;
  readonly category?: PlaceCategory;
  readonly center?: Coordinates;
  readonly radius_m?: number;
  readonly count: number;
}
export interface PlaceSearchResponse {
  readonly places: readonly DiscoveryPlace[];
  readonly warnings: readonly string[];
  readonly requests_attempted: number;
  readonly window_limited: boolean;
}
export interface PlaceSearchProvider {
  search(input: PlaceSearchRequest, signal?: AbortSignal): Promise<PlaceSearchResponse>;
}
export interface TransientDiscovery {
  readonly retention: "request_only"; readonly saving_allowed: false; readonly places: readonly DiscoveryPlace[];
}
export interface DiscoveryQuery {
  readonly destination_slug: string;
  readonly query: string;
  readonly category: PlaceCategory | "all";
  readonly zone: GeoZone | "all";
  readonly page: number;
  readonly page_size: number;
  readonly center?: Coordinates;
  readonly radius_m?: number;
  readonly max_distance_km?: number;
  readonly use_provider: boolean;
}
export interface DiscoveryPage {
  readonly items: readonly (DiscoveryPlace & { readonly geo: ReturnType<typeof classifyGeo>; readonly duplicate_confirmation_required: boolean })[];
  readonly total: number;
  readonly next_page: number | null;
  readonly warnings: readonly string[];
  readonly source: "catalog" | "mixed" | "catalog_fallback";
  readonly provider_requests_attempted: number;
  readonly provider_window_limited: boolean;
  readonly duplicate_matches: readonly DuplicateMatch[];
  readonly duplicates_removed: number;
  readonly duplicate_review_truncated: boolean;
}
