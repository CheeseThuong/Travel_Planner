import { expect, test } from "vitest";
import { normalizeBravePlace } from "@/adapters/discovery/brave-normalize.server";

const raw = { type: "location_result", id: "synthetic-ephemeral-id", title: "Synthetic hotel cafe", coordinates: [11.94, 108.45], categories: ["Hotels", "Cafe"], provider_url: "https://example.com/place?private-token=fixture#details", postal_address: { displayAddress: "Synthetic test address" }, opening_hours: { days: [] }, price_range: "$$$" };
test("normalization preserves provider identity/provenance and never invents hours, VND prices or visit duration", () => {
  const before = structuredClone(raw), result = normalizeBravePlace(raw, "da-lat", "2026-10-29T00:00:00Z");
  expect(result).toMatchObject({ categories: ["cafe", "lodging"], coordinate_confidence: "provider_unverified", address: "Synthetic test address", hours: { state: "hours_unknown" }, price: { state: "unknown" }, suggested_duration_min: null, moderation: "draft", interest_scores: {} });
  expect(result?.sources[0]).toMatchObject({ provider: "brave", provider_id: raw.id, retention: "request_only", url: "https://example.com/place" });
  expect(JSON.stringify(result)).not.toContain("private-token");
  expect(result?.warnings).toContain("PROVIDER_ID_TEMPORARY");
  expect(normalizeBravePlace(raw, "da-lat", "2026-10-29T00:00:00Z")).toEqual(result);
  expect(raw).toEqual(before);
});
test.each([[91, 108], [12, -181], [], null])("malformed coordinates are not replaced by camera/city coordinates: %s", coordinates => {
  expect(normalizeBravePlace({ ...raw, coordinates }, "da-lat", "2026-10-29")).toBeNull();
});
test("missing provider ID or category stays unknown; unsafe source links are discarded without fetching", () => {
  const result = normalizeBravePlace({ ...raw, id: null, categories: [], provider_url: "javascript:alert(1)" }, "da-lat", "2026-10-29");
  expect(result?.sources[0]).toMatchObject({ provider_id: null, url: null });
  expect(result?.warnings).toContain("PROVIDER_ID_MISSING");
  expect(result?.categories).toEqual([]);
});
