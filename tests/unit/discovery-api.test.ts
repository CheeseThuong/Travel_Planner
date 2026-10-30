import { writeFileSync } from "node:fs";
import { afterEach, expect, test, vi } from "vitest";
import { z } from "zod";
import { createDiscoveryHandler } from "@/lib/api/discovery.server";
import { discoveryInputSchema, discoveryPageSchema } from "@/lib/api/discovery-schema.server";
import { DiscoveryProviderError, BravePlaceSearch } from "@/adapters/discovery/brave.server";
import { fromLegacyPlace } from "@/domain/discovery/place";
import type { DiscoveryPage } from "@/domain/discovery/search";
import spec from "../../docs/openapi.json";
import seed from "../../docs/content/da-lat/places.seed.json";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
const id = "e3100000-0000-4000-8000-000000000001";
const request = (body: unknown) => new Request("http://localhost/api/v1/places/search", { method: "POST", headers: { "x-request-id": id }, body: typeof body === "string" ? body : JSON.stringify(body) });
const query = { destination_slug: "da-lat" };
test("no-key catalog paging is complete, deterministic and city-isolated without any network", async () => {
  vi.stubEnv("BRAVE_ENABLED", "false");
  const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("No outbound request")), handler = createDiscoveryHandler();
  const ids: string[] = [];
  for (let page = 0; page < 3; page++) {
    const response = await handler(request({ ...query, page }));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toBe(id);
    const result = (await response.json()).data as DiscoveryPage;
    expect(result.total).toBe(30); expect(result.items).toHaveLength(10); expect(result.source).toBe("catalog");
    expect(result.items.every(place => place.destination_slug === "da-lat" && place.moderation === "draft")).toBe(true);
    expect(result.next_page).toBe(page === 2 ? null : page + 1); ids.push(...result.items.map(place => place.id));
  }
  expect(new Set(ids).size).toBe(30); expect(ids.sort()).toEqual(seed.records.map(place => place.id).sort());
  const fallback = await handler(request({ ...query, use_provider: true }));
  expect((await fallback.json()).data).toMatchObject({ source: "catalog_fallback", provider_requests_attempted: 0, warnings: expect.arrayContaining(["PROVIDER_DISABLED"]) });
  expect(network).not.toHaveBeenCalled();
});
test("validation, size and process quota preserve the actual public error envelope", async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(performance, "now").mockReturnValue(0);
  const handler = createDiscoveryHandler();
  for (const [body, status] of [["{", 400], [{ ...query, destination_slug: "constructor" }, 422], [{ ...query, center: { lat: 12 } }, 422], [{ ...query, category: "invalid" }, 422], [{ ...query, page_size: 21 }, 422], [" ".repeat(8193), 413]] as const) {
    const response = await handler(request(body)); expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ error: { code: "VALIDATION_ERROR", details: {} }, meta: { request_id: id } });
  }
  for (let attempt = 0; attempt < 40; attempt++) await handler(request(query));
  const limited = await handler(request(query)); expect(limited.status).toBe(429);
  expect((await limited.json()).error.code).toBe("RATE_LIMITED");
});
test.each(["quota", "timeout", "unavailable"] as const)("provider %s falls back without changing input or echoing private provider data", async reason => {
  const logs = vi.spyOn(console, "info").mockImplementation(() => {});
  const provider = { search: vi.fn().mockRejectedValue(new DiscoveryProviderError(reason, 1)) }, handler = createDiscoveryHandler(provider);
  const input = { ...query, use_provider: true, query: "chợ" }, before = structuredClone(input);
  const response = await handler(request(input)); expect(response.status).toBe(200);
  expect((await response.json()).data).toMatchObject({ source: "catalog_fallback", provider_requests_attempted: 1, warnings: expect.arrayContaining([reason === "quota" ? "PROVIDER_QUOTA_EXCEEDED" : "PROVIDER_UNAVAILABLE"]) });
  expect(provider.search).toHaveBeenCalledTimes(1); expect(input).toEqual(before); expect(JSON.stringify(logs.mock.calls)).not.toContain("chợ");
});
test("the real Brave adapter pipeline validates its fixture response and keeps request-only provenance", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ type: "locations", results: [{ type: "location_result", id: "fixture-ephemeral", title: "Synthetic cafe", coordinates: [11.94, 108.45], categories: ["Cafe"] }] }));
  const handler = createDiscoveryHandler(new BravePlaceSearch({ apiKey: "fixture-secret", dailyLimit: 1, fetcher }));
  const response = await handler(request({ ...query, category: "cafe", use_provider: true })); expect(response.status).toBe(200);
  const page = (await response.json()).data as DiscoveryPage;
  expect(page.items).toHaveLength(1); expect(page.items[0].coordinate_source).toMatchObject({ provider: "brave", retention: "request_only", provider_id: "fixture-ephemeral" });
  expect(page.source).toBe("mixed"); expect(JSON.stringify(page)).not.toContain("fixture-secret"); expect(fetcher).toHaveBeenCalledTimes(1);
});
test("foreign-city fixture results are filtered and unknown internal failures are redacted", async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  const foreign = { ...fromLegacyPlace(seed.records[0], "nha-trang"), id: "foreign-fixture" };
  const handler = createDiscoveryHandler({ search: async () => ({ places: [foreign], warnings: [], requests_attempted: 1, window_limited: false }) });
  const result = (await (await handler(request({ ...query, use_provider: true }))).json()).data as DiscoveryPage;
  expect(result.items.some(place => place.id === "foreign-fixture")).toBe(false); expect(result.total).toBe(30);
  const broken = createDiscoveryHandler({ search: async () => ({ places: [{ ...foreign, destination_slug: "da-lat", categories: [] }], warnings: ["x".repeat(121)], requests_attempted: 1, window_limited: false }) });
  expect((await broken(request({ ...query, use_provider: true }))).status).toBe(500);
});
test("OpenAPI request/response schemas match actual strict runtime validators", () => {
  const envelope = z.strictObject({ data: discoveryPageSchema, meta: z.strictObject({ request_id: z.uuid() }) });
  const schemas = { DiscoveryInput: z.toJSONSchema(discoveryInputSchema, { io: "input" }), DiscoveryEnvelope: z.toJSONSchema(envelope) };
  writeFileSync("docs/reports/evidence/SD03-02-openapi-schemas.json", JSON.stringify(schemas, null, 2) + "\n");
  expect((spec.components as unknown as { schemas?: unknown }).schemas).toMatchObject(schemas);
  expect(Object.keys(spec.paths)).toContain("/places/search");
});

test("invalid live configuration and caller cancellation return redacted503 without outbound calls", async () => {
  vi.stubEnv("BRAVE_ENABLED", "true"); vi.stubEnv("BRAVE_API_KEY", "fixture-private-key"); vi.stubEnv("BRAVE_DAILY_REQUEST_LIMIT", "0");
  const logs = vi.spyOn(console, "info").mockImplementation(() => {}), network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("No outbound call"));
  const handler = createDiscoveryHandler(), response = await handler(request({ ...query, use_provider: true }));
  expect(response.status).toBe(503); expect((await response.json()).error).toMatchObject({ code: "PROVIDER_UNAVAILABLE", details: {} });
  const controller = new AbortController(); controller.abort();
  const cancelled = new Request("http://localhost/api/v1/places/search", { method: "POST", body: JSON.stringify(query), signal: controller.signal });
  expect((await handler(cancelled)).status).toBe(503);
  expect(network).not.toHaveBeenCalled(); expect(JSON.stringify(logs.mock.calls)).not.toContain("fixture-private-key");
});

test("conflicting repeated candidate IDs cannot overwrite an original catalog record", async () => {
  const original = fromLegacyPlace(seed.records[0], "da-lat");
  const handler = createDiscoveryHandler({ search: async () => ({ places: [{ ...original, title_vi: "Conflicting source fixture" }], warnings: [], requests_attempted: 1, window_limited: false }) });
  const response = await handler(request({ ...query, use_provider: true, page_size: 20 }));
  const page = (await response.json()).data;
  expect(page.total).toBe(31);
  expect(page.duplicate_matches).toContainEqual(expect.objectContaining({ retained_id: original.id, certainty: "suspected" }));
  expect(page.items.find((place: { id: string }) => place.id === original.id)).toMatchObject({ title_vi: original.title_vi, sources: original.sources, duplicate_confirmation_required: true });
});

test("exact repeated provider facts have explicit removal accounting", async () => {
  const original = fromLegacyPlace(seed.records[0], "da-lat");
  const handler = createDiscoveryHandler({ search: async () => ({ places: [structuredClone(original)], warnings: [], requests_attempted: 1, window_limited: false }) });
  const page = (await (await handler(request({ ...query, use_provider: true }))).json()).data;
  expect(page.total).toBe(30); expect(page.duplicates_removed).toBe(1);
  expect(page.duplicate_matches).toContainEqual(expect.objectContaining({ retained_id: original.id, certainty: "certain" }));
});
