import type { Coordinates, OpeningHours, TripStop } from "../model/trip";

export const placeCategories = {
  food: "Ăn uống địa phương", cafe: "Cà phê, trà & bánh", lodging: "Lưu trú",
  landmarks: "Văn hóa & danh thắng", nature: "Thiên nhiên", outdoor: "Hoạt động ngoài trời",
  viewpoint: "Điểm ngắm cảnh", shopping: "Chợ & mua sắm", family: "Gia đình & giải trí", services: "Dịch vụ & giao thông",
} as const;
export type PlaceCategory = keyof typeof placeCategories;
export type LegacyCategory = "culture" | "museum" | "beach" | "park" | "market" | "attraction";
export const legacyCategories: Readonly<Record<LegacyCategory, PlaceCategory>> = {
  culture: "landmarks", museum: "landmarks", beach: "nature", park: "nature", market: "shopping", attraction: "landmarks",
};
export interface PlaceSource {
  readonly provider: "openstreetmap" | "editorial" | "brave" | "google" | "user";
  readonly provider_id: string | null;
  readonly url: string | null;
  readonly license: string;
  readonly retrieved_at: string;
  readonly retention: "open_license" | "user_owned" | "request_only";
}
export interface DiscoveryPlace {
  readonly id: string;
  readonly destination_slug: string;
  readonly title_vi: string;
  readonly alternate_names: readonly string[];
  readonly description: string;
  readonly address: string | null;
  readonly location: Coordinates;
  readonly coordinate_confidence: "community_point" | "geometry_center_not_entrance" | "provider_unverified" | "user_confirmed" | "verified_entrance";
  readonly coordinate_source: PlaceSource;
  readonly sources: readonly PlaceSource[];
  readonly categories: readonly PlaceCategory[];
  readonly tags: readonly string[];
  readonly suggested_duration_min: number | null;
  readonly hours: OpeningHours;
  readonly price: Readonly<{ state: "unknown" }> | Readonly<{ state: "known"; currency: "VND"; min_vnd: number; max_vnd: number; checked_at: string; source: PlaceSource }>;
  readonly accessibility: "unknown" | "step_free" | "restricted";
  readonly transport_constraint: TripStop["transport_constraint"];
  readonly interest_scores: Readonly<Record<string, number>>;
  readonly moderation: "draft" | "submitted" | "approved" | "rejected";
  readonly warnings: readonly string[];
}

export interface LegacyPlaceInput {
  readonly id: string; readonly title_vi: string; readonly category: LegacyCategory; readonly description_vi: string;
  readonly lat: number; readonly lng: number; readonly coordinate_quality: "community_point" | "geometry_center_not_entrance";
  readonly recommended_duration_min: number; readonly caution_notes: readonly string[];
  readonly transport_constraint: "access_unverified" | "manual_island_transfer_required";
  readonly data_source: Readonly<{ object_type: string; object_id: number; url: string; license: string; retrieved_on: string }>;
}

/** Projects independently sourced legacy records without upgrading their verification or rights. */
export function fromLegacyPlace(record: LegacyPlaceInput, destination: string): DiscoveryPlace {
  const source: PlaceSource = { provider: "openstreetmap", provider_id: `${record.data_source.object_type}/${record.data_source.object_id}`, url: record.data_source.url, license: record.data_source.license, retrieved_at: record.data_source.retrieved_on, retention: "open_license" };
  return {
    id: record.id, destination_slug: destination, title_vi: record.title_vi, alternate_names: [], description: record.description_vi, address: null,
    location: { lat: record.lat, lng: record.lng }, coordinate_confidence: record.coordinate_quality, coordinate_source: source, sources: [source],
    categories: [legacyCategories[record.category]], tags: [`legacy:${record.category}`], suggested_duration_min: record.recommended_duration_min,
    hours: { state: "hours_unknown" }, price: { state: "unknown" }, accessibility: "unknown",
    transport_constraint: record.transport_constraint === "manual_island_transfer_required" ? "manual_transfer" : "access_unverified",
    interest_scores: {}, moderation: "draft", warnings: [...record.caution_notes],
  };
}

export const normalizePlaceText = (value: string): string => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function isVisitCandidate(place: DiscoveryPlace): boolean {
  return place.moderation !== "rejected" && place.categories.length > 0 && !place.categories.includes("lodging") && !place.categories.includes("services");
}
