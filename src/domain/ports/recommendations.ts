import type { Pace, TransportMode } from "../model/trip";
import type { PlaceCategory } from "../discovery/place";

export interface RankingPreferences {
  readonly day_count: number; readonly party_size: number; readonly pace: Pace; readonly transport_mode: TransportMode;
  readonly interests: readonly PlaceCategory[];
  readonly budget_band: "unspecified" | "economy" | "moderate" | "flexible";
  readonly food_preference: "any" | "vegetarian" | "vegan" | "seafood" | "local_food";
  readonly accommodation_preference: "any" | "hotel" | "resort" | "homestay" | "hostel" | "villa";
  readonly time_of_day: "any" | "morning" | "afternoon" | "evening";
}
export interface RankingCandidate {
  readonly id: string; readonly categories: readonly PlaceCategory[]; readonly distance_from_center_km: number;
  readonly is_required: boolean; readonly retention: "open_license" | "user_owned";
}
export type RankingReason = "preference_match" | "geographic_proximity" | "experience_variety" | "general_suggestion";
export interface RankingResult {
  readonly ordered: readonly { readonly id: string; readonly reason: RankingReason }[];
  readonly model: string;
  readonly usage: { readonly requests_attempted: 0 | 1; readonly reserved_tokens: number; readonly reserved_cost_micro_usd: number };
}
export interface RecommendationProvider {
  rank(preferences: RankingPreferences, candidates: readonly RankingCandidate[], signal?: AbortSignal): Promise<RankingResult>;
}
