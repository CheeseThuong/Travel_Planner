import { describe, expect, test } from "vitest";
import { filterCatalog, type CatalogPlace } from "@/domain/catalog";

const places: CatalogPlace[] = [
  { id: "1", slug: "cho-da-lat", title: "Chợ Đà Lạt", category: "market", description: "Khu chợ trung tâm", durationMinutes: 60, lat: 1, lng: 1, sourceUrl: "https://example.com/1" },
  { id: "2", slug: "thac-datanla", title: "Thác Datanla", category: "attraction", description: "Thác nước", durationMinutes: 90, lat: 2, lng: 2, sourceUrl: "https://example.com/2" },
];

describe("catalog filtering", () => {
  test("matches Vietnamese text with or without accents", () => {
    expect(filterCatalog(places, "cho da lat", "all").map((place) => place.id)).toEqual(["1"]);
  });

  test("combines category and query without mutating the source", () => {
    expect(filterCatalog(places, "thac", "attraction").map((place) => place.id)).toEqual(["2"]);
    expect(filterCatalog(places, "thac", "market")).toEqual([]);
    expect(places).toHaveLength(2);
  });
});
