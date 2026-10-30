import { test, expect } from "@playwright/test";

test("public discovery route pages the real city catalog with explicit unknowns and source", async ({ request }) => {
  const ids = new Set();
  for (let page = 0; page < 3; page++) {
    const response = await request.post("/api/v1/places/search", { data: { destination_slug: "da-lat", page, use_provider: false } });
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("no-store");
    const { data } = await response.json();
    expect(data.total).toBe(30); expect(data.provider_requests_attempted).toBe(0);
    expect(Array.isArray(data.duplicate_matches)).toBe(true); expect(data.duplicates_removed).toBe(0);
    for (const place of data.items) {
      expect(place.destination_slug).toBe("da-lat"); expect(place.moderation).toBe("draft");
      expect(place.hours.state).toBe("hours_unknown"); expect(place.price.state).toBe("unknown");
      expect(place.sources[0].license).toBe("ODbL-1.0"); ids.add(place.id);
      expect(typeof place.duplicate_confirmation_required).toBe("boolean");
    }
  }
  expect(ids.size).toBe(30);
  const filtered = await request.post("/api/v1/places/search", { data: { destination_slug: "da-lat", query: "cho da lat", category: "shopping", zone: "center", use_provider: false } });
  expect((await filtered.json()).data.items.map(place => place.title_vi)).toContain("Chợ Đà Lạt");
});
