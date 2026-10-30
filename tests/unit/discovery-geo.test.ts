import { expect, test } from "vitest";
import { classifyGeo, pointInFence, type CityGeoConfig, type GeoFence } from "@/domain/discovery/geo";
import { cityGeoConfigs, getCityGeo } from "@/domain/discovery/cities";

const box: GeoFence = { kind: "bbox", south: 0, north: 2, west: 0, east: 2 };
const polygon: GeoFence = { kind: "polygon", vertices: [{ lat: 0, lng: 0 }, { lat: 2, lng: 0 }, { lat: 2, lng: 2 }, { lat: 0, lng: 2 }] };
test.each([box, polygon])("geofences include edges/vertices and reject outside points: $kind", fence => {
  for (const point of [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, { lat: 2, lng: 1 }, { lat: 2, lng: 2 }]) expect(pointInFence(point, fence)).toBe(true);
  expect(pointInFence({ lat: 2.01, lng: 1 }, fence)).toBe(false);
});
test("concave polygon is not treated as its bounding box", () => {
  const fence: GeoFence = { kind: "polygon", vertices: [{ lat: 0, lng: 0 }, { lat: 0, lng: 3 }, { lat: 1, lng: 1 }, { lat: 3, lng: 0 }] };
  expect(pointInFence({ lat: 2, lng: 2 }, fence)).toBe(false);
  expect(pointInFence({ lat: 0.5, lng: 0.5 }, fence)).toBe(true);
});
test("invalid points, inverted boxes, degenerate/oversized polygons fail explicitly", () => {
  expect(() => pointInFence({ lat: NaN, lng: 0 }, box)).toThrow();
  expect(() => pointInFence({ lat: 1, lng: 1 }, { ...box, south: 3 })).toThrow();
  for (const vertices of [[], [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, { lat: 2, lng: 2 }], Array.from({ length: 129 }, () => ({ lat: 0, lng: 0 }))]) expect(() => pointInFence({ lat: 1, lng: 1 }, { kind: "polygon", vertices })).toThrow();
});
test.each(Object.values(cityGeoConfigs))("$slug zones are deterministic data-driven bands with explicit transfer override", city => {
  const before = structuredClone(city);
  expect(classifyGeo(city.center, city)).toMatchObject({ zone: "center", distance_km: 0, provenance: "editorial_discovery_area_not_administrative_boundary" });
  expect(classifyGeo({ lat: city.center.lat + 0.06, lng: city.center.lng }, city).zone).toBe("nearby");
  expect(classifyGeo({ lat: city.center.lat + 0.16, lng: city.center.lng }, city).zone).toBe("outskirts");
  expect(classifyGeo({ lat: city.center.lat + 0.5, lng: city.center.lng }, city).zone).toBe("remote");
  expect(classifyGeo(city.center, city, true).zone).toBe("special_transport");
  expect(city).toEqual(before);
});
test("a future city only needs configuration; geographic bands do not depend on query radius", () => {
  const city: CityGeoConfig = { ...cityGeoConfigs["da-lat"], slug: "synthetic-city", center: { lat: 1, lng: 1 }, core: box, nearby_km: 10, outskirts_km: 20 };
  expect(classifyGeo(city.center, city).zone).toBe("center");
  expect(classifyGeo({ lat: 1, lng: 2.2 }, city).zone).toBe("remote");
  expect(() => classifyGeo(city.center, { ...city, outskirts_km: 5 })).toThrow();
  expect(cityGeoConfigs["unknown-city"]).toBeUndefined();
  expect(() => getCityGeo("unknown-city")).toThrow("Unsupported discovery city");
  expect(() => getCityGeo("constructor")).toThrow("Unsupported discovery city");
});
