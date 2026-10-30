import { haversineKm } from "../routing/matrix";
import { classifyGeo, type CityGeoConfig } from "./geo";
import { normalizePlaceText, type DiscoveryPlace } from "./place";
import type { DiscoveryQuery } from "./search";

/** Radius is a search-provider bias. Only an explicit max_distance_km removes distant candidates. */
export function filterDiscovery(places: readonly DiscoveryPlace[], input: DiscoveryQuery, city: CityGeoConfig) {
  const query = normalizePlaceText(input.query);
  return places.filter(place => place.destination_slug === input.destination_slug && place.moderation !== "rejected")
    .filter(place => input.category === "all" || place.categories.includes(input.category))
    .filter(place => !query || normalizePlaceText([place.title_vi, ...place.alternate_names, place.description, place.address ?? "", ...place.tags].join(" ")).includes(query))
    .map(place => ({ ...place, geo: classifyGeo(place.location, city, place.transport_constraint === "manual_transfer") }))
    .filter(place => input.zone === "all" || place.geo.zone === input.zone)
    .filter(place => input.max_distance_km === undefined || haversineKm(input.center ?? city.center, place.location) <= input.max_distance_km)
    .sort((a, b) => input.center ? haversineKm(input.center, a.location) - haversineKm(input.center, b.location) || a.id.localeCompare(b.id, "en") : a.id.localeCompare(b.id, "en"));
}
