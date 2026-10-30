import { expect, test } from "vitest";
import { editorialCatalogSummaries, editorialDiscoveryCatalogs } from "@/adapters/discovery/editorial.server";
import { filterCatalogDiscovery, legacySummaryDiscovery } from "@/domain/catalog";
import nhaTrang from "../../docs/content/places.seed.json";
import daLat from "../../docs/content/da-lat/places.seed.json";

test("shared summary preserves all60 original identities/locations/categories, source rights and transport constraints", () => {
  for (const seed of [nhaTrang, daLat]) {
    const summaries = editorialCatalogSummaries[seed.destination_slug as keyof typeof editorialCatalogSummaries];
    expect(summaries).toHaveLength(30);
    for (const record of seed.records) {
      const place = summaries.find(place => place.id === record.id);
      expect(place).toMatchObject({ id: record.id, slug: record.slug, title: record.title_vi, category: record.category, lat: record.lat, lng: record.lng, destinationSlug: seed.destination_slug, coordinateQuality: record.coordinate_quality, hours: { state: "hours_unknown" }, transportConstraint: record.transport_constraint === "manual_island_transfer_required" ? "manual_transfer" : "access_unverified" });
      expect(place?.source).toMatchObject({ provider: "openstreetmap", license: "ODbL-1.0", provider_id: `${record.data_source.object_type}/${record.data_source.object_id}` });
    }
  }
});
test("canonical category/zone filters preserve original records and reject mixed city data", () => {
  const places = Object.values(editorialCatalogSummaries).flat(), before = structuredClone(places);
  expect(filterCatalogDiscovery(places, "", "all", "all", "da-lat")).toHaveLength(30);
  expect(filterCatalogDiscovery(places, "cho da lat", "shopping", "center", "da-lat").map(place => place.title)).toContain("Chợ Đà Lạt");
  expect(filterCatalogDiscovery(places, "", "all", "special_transport", "nha-trang").map(place => place.title)).toEqual(["Thủy cung Trí Nguyên"]);
  expect(places).toEqual(before);
});
test("offline summary projection equals every original full-source record and declines incomplete metadata",()=>{
  for(const [city,places]of Object.entries(editorialCatalogSummaries))for(const summary of places){const before=structuredClone(summary);expect(legacySummaryDiscovery(summary)).toEqual(editorialDiscoveryCatalogs[city].find(place=>place.id===summary.id));expect(summary).toEqual(before);}
  expect(legacySummaryDiscovery({...editorialCatalogSummaries["da-lat"][0],source:undefined})).toBeNull();
});
