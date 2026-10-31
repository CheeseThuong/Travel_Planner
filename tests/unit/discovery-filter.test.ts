import { expect, test } from "vitest";
import { filterDiscovery } from "@/domain/discovery/filter";
import { getCityGeo } from "@/domain/discovery/cities";
import { fromLegacyPlace } from "@/domain/discovery/place";
import type { DiscoveryQuery } from "@/domain/discovery/search";
import daLat from "../../docs/content/da-lat/places.seed.json";
import nhaTrang from "../../docs/content/places.seed.json";

const places = [daLat, nhaTrang].flatMap(seed => seed.records.map(record => fromLegacyPlace(record, seed.destination_slug)));
const input: DiscoveryQuery = { destination_slug: "da-lat", query: "", category: "all", zone: "all", page: 0, page_size: 10, use_provider: false };
test("city/query/category/zone compose without rewriting or mixing catalog records", () => {
  const before = structuredClone(places), city = getCityGeo("da-lat");
  expect(filterDiscovery(places, input, city)).toHaveLength(30);
  const result = filterDiscovery(places, { ...input, query: "cho da lat", category: "shopping", zone: "center" }, city);
  expect(result.map(place => place.title_vi)).toContain("Chợ Đà Lạt");
  expect(result.every(place => place.destination_slug === "da-lat")).toBe(true);
  expect(places).toEqual(before);
});
test("radius does not silently become a border; travel tolerance is a distinct explicit filter", () => {
  const city = getCityGeo("da-lat"), initial = filterDiscovery(places, input, city);
  expect(filterDiscovery(places, { ...input, radius_m: 1 }, city)).toEqual(initial);
  const close = filterDiscovery(places, { ...input, max_distance_km: 0 }, city);
  expect(close.every(place => place.geo.distance_km === 0)).toBe(true);
  expect(close.length).toBeLessThan(initial.length);
});
test("unknown query/category is an honest empty result and rejected content stays hidden", () => {
  const city = getCityGeo("da-lat");
  expect(filterDiscovery(places, { ...input, category: "lodging" }, city)).toEqual([]);
  expect(filterDiscovery(places, { ...input, query: "synthetic-no-matching-venue" }, city)).toEqual([]);
  expect(filterDiscovery(places.map(place => ({ ...place, moderation: "rejected" as const })), input, city)).toEqual([]);
});
