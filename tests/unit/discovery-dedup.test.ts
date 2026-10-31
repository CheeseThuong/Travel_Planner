import { expect, test } from "vitest";
import { deduplicateDiscovery } from "@/domain/discovery/dedup";
import { fromLegacyPlace, type DiscoveryPlace } from "@/domain/discovery/place";
import seed from "../../docs/content/da-lat/places.seed.json";

const a = fromLegacyPlace(seed.records[0], "da-lat");
function other(overrides: Partial<DiscoveryPlace> = {}): DiscoveryPlace {
  const source = { ...a.coordinate_source, provider: "brave" as const, provider_id: "synthetic-brave-id", retention: "request_only" as const, license: "synthetic-provider-terms" };
  return { ...a, id: "other", coordinate_source: source, sources: [source], ...overrides };
}
test("only exact same-source facts collapse with explicit accounting and immutable inputs", () => {
  const input = [a, structuredClone(a)], before = structuredClone(input), result = deduplicateDiscovery(input);
  expect(result.places).toEqual([a]); expect(result.removed).toBe(1);
  expect(result.matches[0]).toMatchObject({ retained_id: a.id, certainty: "certain", reasons: ["PROVIDER_IDENTITY", "EXACT_FACTS"] });
  expect(input).toEqual(before); expect(deduplicateDiscovery(input)).toEqual(result);
});
test("matching names/addresses across providers are suspected and keep both source rights", () => {
  const b = other({ title_vi: "Cho Da Lat", address: "Synthetic address" }), result = deduplicateDiscovery([a, b]);
  expect(result.places).toHaveLength(2); expect(result.removed).toBe(0); expect(result.matches[0].certainty).toBe("suspected");
  expect(result.places[0].sources).toEqual(a.sources); expect(result.places[1].sources).toEqual(b.sources);
});
test.each([
  { description: "Conflicting description" }, { destination_slug: "nha-trang" }, { location: { lat: 13, lng: 109 } },
  { sources: [{ ...a.sources[0], license: "different-license" }] },
])("shared identity with conflicting facts/rights/destination is never auto-merged: %s", changes => {
  const result = deduplicateDiscovery([a, { ...a, ...changes }]);
  expect(result.places).toHaveLength(2); expect(new Set(result.places.map(place => place.id)).size).toBe(2);
  expect(result.matches[0].certainty).toBe("suspected"); expect(result.removed).toBe(0);
});
test("same raw provider ID in a different namespace is not a strong identity match", () => {
  const b = other({ title_vi: "Entirely distinct fixture" });
  const source = { ...b.sources[0], provider_id: a.sources[0].provider_id };
  expect(deduplicateDiscovery([a, { ...b, sources: [source] }]).matches).toEqual([]);
});
test("chain/brand/distant/category conflicts never produce a transitive auto-merge", () => {
  const b = other(), c = other({ id: "third", location: { lat: a.location.lat + 0.1, lng: a.location.lng }, sources: [{ ...other().sources[0], provider_id: "third-provider-id" }] });
  const result = deduplicateDiscovery([a, b, c]);
  expect(result.places).toHaveLength(3); expect(result.removed).toBe(0); expect(result.matches).toHaveLength(1);
  expect(deduplicateDiscovery([a, other({ categories: ["lodging"] })]).matches).toEqual([]);
});
test("pair review output is bounded without dropping uncertain records", () => {
  const input = Array.from({ length: 130 }, (_, index) => other({ id: `candidate-${index}`, sources: [{ ...other().sources[0], provider_id: `provider-${index}` }] }));
  const result = deduplicateDiscovery(input);
  expect(result.places).toHaveLength(130); expect(result.matches).toHaveLength(200); expect(result.truncated).toBe(true); expect(result.removed).toBe(0);
  expect(result.confirmation_ids).toHaveLength(130);
  expect(() => deduplicateDiscovery([...input, a])).toThrow("Discovery candidate limit");
});
