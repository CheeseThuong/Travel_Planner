import { z } from "zod";
import { fromLegacyPlace, legacyCategories, type LegacyCategory } from "@/domain/discovery/place";
import nhaTrang from "../../../docs/content/places.seed.json";
import daLat from "../../../docs/content/da-lat/places.seed.json";
import type { CatalogPlace } from "@/domain/catalog";

const recordSchema = z.object({
  id: z.uuid(), slug: z.string().regex(/^[a-z0-9-]+$/), title_vi: z.string().min(1).max(200), category: z.enum(Object.keys(legacyCategories) as [LegacyCategory, ...LegacyCategory[]]), description_vi: z.string().max(8000),
  lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), coordinate_quality: z.enum(["community_point", "geometry_center_not_entrance"]),
  recommended_duration_min: z.number().int().min(15).max(720), caution_notes: z.array(z.string().max(2048)).max(32), transport_constraint: z.enum(["access_unverified", "manual_island_transfer_required"]),
  data_source: z.object({ provider: z.literal("openstreetmap"), object_type: z.enum(["node", "way", "relation"]), object_id: z.number().int().positive(), url: z.string().regex(/^https:\/\/www\.openstreetmap\.org\//), license: z.literal("ODbL-1.0"), retrieved_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
});
export const editorialDiscoveryCatalogs = Object.fromEntries([nhaTrang, daLat].map(seed => [seed.destination_slug, seed.records.map(record => fromLegacyPlace(recordSchema.parse(record), seed.destination_slug))]));

function summaries(seed: typeof nhaTrang | typeof daLat): CatalogPlace[] {
  return seed.records.map(raw => {
    const record = recordSchema.parse(raw), place = fromLegacyPlace(record, seed.destination_slug);
    return { id: record.id, slug: record.slug, title: record.title_vi, category: record.category, description: record.description_vi, durationMinutes: record.recommended_duration_min, lat: record.lat, lng: record.lng, sourceUrl: record.data_source.url,
      destinationSlug: seed.destination_slug, categories: place.categories, tags: place.tags, coordinateQuality: place.coordinate_confidence, source: place.coordinate_source, hours: place.hours, transportConstraint: place.transport_constraint, warnings: place.warnings };
  });
}
export const editorialCatalogSummaries = { "nha-trang": summaries(nhaTrang), "da-lat": summaries(daLat) };
