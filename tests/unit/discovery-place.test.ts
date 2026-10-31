import { expect, test } from "vitest";
import { fromLegacyPlace, isVisitCandidate, legacyCategories, normalizePlaceText, placeCategories } from "@/domain/discovery/place";
import nhaTrang from "../../docs/content/places.seed.json";
import daLat from "../../docs/content/da-lat/places.seed.json";

test("all60 legacy records keep identities, cities, source rights and explicit unknowns", () => {
  const before = structuredClone([nhaTrang, daLat]);
  const places = [nhaTrang, daLat].flatMap(seed => seed.records.map(record => {
    const place = fromLegacyPlace(record, seed.destination_slug);
    expect(place).toMatchObject({ id: record.id, title_vi: record.title_vi, destination_slug: seed.destination_slug, location: { lat: record.lat, lng: record.lng }, coordinate_confidence: record.coordinate_quality, moderation: "draft", address: null, hours: { state: "hours_unknown" }, price: { state: "unknown" }, accessibility: "unknown", interest_scores: {} });
    expect(place.coordinate_source).toEqual(place.sources[0]);
    expect(place.coordinate_source).toMatchObject({ provider: "openstreetmap", license: "ODbL-1.0", url: record.data_source.url, provider_id: `${record.data_source.object_type}/${record.data_source.object_id}`, retention: "open_license" });
    expect(place.tags).toEqual([`legacy:${record.category}`]);
    expect(place.transport_constraint).toBe(record.transport_constraint === "manual_island_transfer_required" ? "manual_transfer" : "access_unverified");
    return place;
  }));
  expect(places).toHaveLength(60);
  expect(new Set(places.map(place => place.id)).size).toBe(60);
  expect([nhaTrang, daLat]).toEqual(before);
});
test("ten groups coexist with every legacy category without inferring a precise attraction type", () => {
  expect(Object.keys(placeCategories)).toHaveLength(10);
  expect(Object.keys(legacyCategories).sort()).toEqual(["attraction", "beach", "culture", "market", "museum", "park"]);
  expect(legacyCategories.attraction).toBe("landmarks");
});
test("lodging and services never become default sightseeing candidates, including mixed tags", () => {
  const place = fromLegacyPlace(nhaTrang.records[0], "nha-trang");
  expect(isVisitCandidate(place)).toBe(true);
  expect(isVisitCandidate({ ...place, categories: ["food", "lodging"], tags: ["hotel", "restaurant"] })).toBe(false);
  expect(isVisitCandidate({ ...place, categories: ["services"] })).toBe(false);
  expect(isVisitCandidate({ ...place, moderation: "rejected" })).toBe(false);
  expect(isVisitCandidate({ ...place, categories: [] })).toBe(false);
});
test("name matching handles Vietnamese accents/punctuation without changing names", () => {
  expect(normalizePlaceText("  ĐÀ LẠT — Cà phê! ")).toBe("da lat ca phe");
});
