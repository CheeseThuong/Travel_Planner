import type { CityGeoConfig } from "./geo";

/** Editorial search areas; these are neither surveyed city borders nor travel-time zones. */
export const cityGeoConfigs: Readonly<Record<string, CityGeoConfig>> = {
  "nha-trang": { slug: "nha-trang", center: { lat: 12.2451, lng: 109.1943 }, core: { kind: "bbox", south: 12.22, north: 12.28, west: 109.17, east: 109.22 }, nearby_km: 12, outskirts_km: 30, provenance: "editorial_discovery_area_not_administrative_boundary" },
  "da-lat": { slug: "da-lat", center: { lat: 11.9404, lng: 108.4583 }, core: { kind: "polygon", vertices: [{ lat: 11.92, lng: 108.425 }, { lat: 11.965, lng: 108.425 }, { lat: 11.965, lng: 108.48 }, { lat: 11.92, lng: 108.48 }] }, nearby_km: 10, outskirts_km: 25, provenance: "editorial_discovery_area_not_administrative_boundary" },
};

export function getCityGeo(slug: string): CityGeoConfig {
  if (!Object.hasOwn(cityGeoConfigs, slug)) throw new RangeError("Unsupported discovery city");
  return cityGeoConfigs[slug];
}
