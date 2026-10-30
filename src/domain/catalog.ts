import type { DiscoveryPlace, PlaceCategory, PlaceSource } from "./discovery/place";
import type { GeoZone } from "./discovery/geo";
import { classifyGeo } from "./discovery/geo";
import { getCityGeo } from "./discovery/cities";
import type { OpeningHours, TripStop } from "./model/trip";

export interface CatalogPlace {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly category: string;
  readonly description: string;
  readonly durationMinutes: number;
  readonly lat: number;
  readonly lng: number;
  readonly sourceUrl: string;
  readonly destinationSlug?: string;
  readonly categories?: readonly PlaceCategory[];
  readonly tags?: readonly string[];
  readonly coordinateQuality?: DiscoveryPlace["coordinate_confidence"];
  readonly source?: PlaceSource;
  readonly hours?: OpeningHours;
  readonly transportConstraint?: TripStop["transport_constraint"];
  readonly warnings?: readonly string[];
}

function searchable(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d");
}

export function filterCatalog(places: readonly CatalogPlace[], query: string, category: string): CatalogPlace[] {
  const needle = searchable(query.trim());
  return places.filter((place) => {
    const matchesCategory = category === "all" || place.category === category || place.categories?.includes(category as PlaceCategory);
    const matchesQuery = !needle || searchable(`${place.title} ${place.description} ${(place.tags ?? []).join(" ")}`).includes(needle);
    return matchesCategory && matchesQuery;
  });
}

export function filterCatalogDiscovery(places: readonly CatalogPlace[], query: string, category: string, zone: GeoZone | "all", destination: string): CatalogPlace[] {
  const city = getCityGeo(destination);
  return filterCatalog(places, query, category).filter(place => !place.destinationSlug || place.destinationSlug === destination)
    .filter(place => zone === "all" || classifyGeo({ lat: place.lat, lng: place.lng }, city, place.transportConstraint === "manual_transfer").zone === zone);
}

/** Offline compatibility projection for the original source-complete OSM summaries only. */
export function legacySummaryDiscovery(place: CatalogPlace): DiscoveryPlace | null {
  if (!place.destinationSlug || !place.source || place.source.provider !== "openstreetmap" || place.source.retention !== "open_license" || place.source.url !== place.sourceUrl || !place.coordinateQuality || !place.categories || !place.hours || !place.transportConstraint) return null;
  return { id: place.id, destination_slug: place.destinationSlug, title_vi: place.title, alternate_names: [], description: place.description, address: null, location: { lat: place.lat, lng: place.lng }, coordinate_confidence: place.coordinateQuality,
    coordinate_source: place.source, sources: [place.source], categories: place.categories, tags: place.tags ?? [], suggested_duration_min: place.durationMinutes, hours: place.hours,
    price: { state: "unknown" }, accessibility: "unknown", transport_constraint: place.transportConstraint, interest_scores: {}, moderation: "draft", warnings: place.warnings ?? [] };
}
