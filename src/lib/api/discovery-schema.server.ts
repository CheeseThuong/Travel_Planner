import { z } from "zod";
import { editorialDiscoveryCatalogs } from "@/adapters/discovery/editorial.server";
import { placeCategories, type PlaceCategory } from "@/domain/discovery/place";
import { geoZoneLabels, type GeoZone } from "@/domain/discovery/geo";

const category = z.enum(Object.keys(placeCategories) as [PlaceCategory, ...PlaceCategory[]]);
const zone = z.enum(Object.keys(geoZoneLabels) as [GeoZone, ...GeoZone[]]);
const location = z.strictObject({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
export const discoveryInputSchema = z.strictObject({
  destination_slug: z.enum(Object.keys(editorialDiscoveryCatalogs) as [string, ...string[]]),
  query: z.string().trim().max(200).regex(/^[^\u0000-\u001f\u007f]*$/u).default(""),
  category: z.union([category, z.literal("all")]).default("all"), zone: z.union([zone, z.literal("all")]).default("all"),
  page: z.number().int().min(0).max(129).default(0), page_size: z.number().int().min(1).max(20).default(10),
  center: location.optional(), radius_m: z.number().int().min(1).max(100000).optional(), max_distance_km: z.number().min(0).max(200).optional(), use_provider: z.boolean().default(false),
});
const source = z.strictObject({ provider: z.enum(["openstreetmap", "editorial", "brave", "google", "user"]), provider_id: z.string().min(1).max(500).nullable(), url: z.string().max(2048).nullable(), license: z.string().min(1).max(200), retrieved_at: z.string().min(10).max(64), retention: z.enum(["open_license", "user_owned", "request_only"]) });
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const hours = z.discriminatedUnion("state", [z.strictObject({ state: z.literal("hours_unknown") }), z.strictObject({ state: z.literal("verified_editorial"), checked_at: z.string().max(64), source: z.string().min(1).max(2048), intervals: z.array(z.strictObject({ weekday: z.number().int().min(0).max(6), start_local: time, end_local: z.union([time, z.literal("24:00")]) })).max(28) })]);
const money = z.number().int().min(0).max(1000000000000);
export const discoveryItemSchema = z.strictObject({
  id: z.string().min(1).max(160), destination_slug: z.string().min(1).max(80), title_vi: z.string().min(1).max(200), alternate_names: z.array(z.string().max(200)).max(20), description: z.string().max(8000), address: z.string().max(500).nullable(), location,
  coordinate_confidence: z.enum(["community_point", "geometry_center_not_entrance", "provider_unverified", "user_confirmed", "verified_entrance"]), coordinate_source: source, sources: z.array(source).min(1).max(8), categories: z.array(category).max(10), tags: z.array(z.string().max(120)).max(32), suggested_duration_min: z.number().int().min(15).max(720).nullable(), hours,
  price: z.discriminatedUnion("state", [z.strictObject({ state: z.literal("unknown") }), z.strictObject({ state: z.literal("known"), currency: z.literal("VND"), min_vnd: money, max_vnd: money, checked_at: z.string().max(64), source })]),
  accessibility: z.enum(["unknown", "step_free", "restricted"]), transport_constraint: z.enum(["land", "manual_transfer", "access_unverified"]), interest_scores: z.record(z.string().min(1).max(80), z.number().min(0).max(1)), moderation: z.enum(["draft", "submitted", "approved", "rejected"]), warnings: z.array(z.string().max(2048)).max(32),
  geo: z.strictObject({ zone, distance_km: z.number().nonnegative(), provenance: z.literal("editorial_discovery_area_not_administrative_boundary") }),
  duplicate_confirmation_required: z.boolean(),
});
export const discoveryPageSchema = z.strictObject({ items: z.array(discoveryItemSchema).max(20), total: z.number().int().min(0).max(130), next_page: z.number().int().min(0).max(129).nullable(), warnings: z.array(z.string().max(120)).max(100), source: z.enum(["catalog", "mixed", "catalog_fallback"]), provider_requests_attempted: z.number().int().min(0).max(1), provider_window_limited: z.boolean(), duplicate_matches: z.array(z.strictObject({ retained_id: z.string().max(160), duplicate_id: z.string().max(160), certainty: z.enum(["certain", "suspected"]), reasons: z.array(z.string().max(120)).min(1).max(10) })).max(200), duplicates_removed: z.number().int().min(0).max(129), duplicate_review_truncated: z.boolean() });
