import { expect, test, vi } from "vitest";
import { BravePlaceSearch } from "@/adapters/discovery/brave.server";
import type { PlaceSearchRequest } from "@/domain/discovery/search";

const input: PlaceSearchRequest = { destination_slug: "da-lat", city_name: "Da Lat", query: "cà phê", category: "cafe", count: 20 };
const body = { type: "locations", results: [{ type: "location_result", id: "synthetic-id", title: "Synthetic cafe", coordinates: [11.94, 108.45], categories: ["Cafe"] }] };
const response = () => Response.json(body);
test("actual documented endpoint/header/query/city and coordinate/radius requests, with no invented offset", async () => {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => response());
  const provider = new BravePlaceSearch({ apiKey: "fixture-server-secret", dailyLimit: 10, fetcher });
  const result = await provider.search(input);
  const [target, init] = fetcher.mock.calls[0], url = new URL(String(target));
  expect(url.origin + url.pathname).toBe("https://api.search.brave.com/res/v1/local/place_search");
  expect(url.searchParams.get("location")).toBe("Da Lat Vietnam");
  expect(url.searchParams.get("q")).toContain("cà phê");
  expect(url.searchParams.has("offset")).toBe(false);
  expect(init).toMatchObject({ headers: { "X-Subscription-Token": "fixture-server-secret" }, redirect: "error", cache: "no-store" });
  expect(result.places).toHaveLength(1); expect(JSON.stringify(result)).not.toContain("fixture-server-secret");
  await provider.search({ ...input, center: { lat: 12, lng: 109 }, radius_m: 1000 });
  const nearby = new URL(String(fetcher.mock.calls[1][0]));
  expect(nearby.searchParams.get("latitude")).toBe("12"); expect(nearby.searchParams.get("radius")).toBe("1000"); expect(nearby.searchParams.has("location")).toBe(false);
});
test.each([429, 500])("provider HTTP%s has one bounded attempt and redacted failure", async status => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("fixture-secret-private-query", { status }));
  const provider = new BravePlaceSearch({ apiKey: "fixture-secret", dailyLimit: 1, fetcher });
  await expect(provider.search(input)).rejects.toMatchObject({ reason: status === 429 ? "quota" : "unavailable", requests_attempted: 1 });
  await expect(provider.search(input)).rejects.toMatchObject({ reason: "quota", requests_attempted: 0 });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test("timeout and caller abort finish even if transport ignores cancellation", async () => {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
  const provider = new BravePlaceSearch({ apiKey: "fixture", dailyLimit: 3, timeoutMs: 5, fetcher });
  await expect(provider.search(input)).rejects.toMatchObject({ reason: "timeout", requests_attempted: 1 });
  const controller = new AbortController(), pending = provider.search(input, controller.signal); controller.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(fetcher).toHaveBeenCalledTimes(2);
});
test("per-minute/day counters reserve failures, survive backward clocks, and reject before fetch", async () => {
  let now = Date.parse("2026-10-29T12:00:00Z");
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => response());
  const provider = new BravePlaceSearch({ apiKey: "fixture", dailyLimit: 2, minuteLimit: 1, fetcher, now: () => now });
  await provider.search(input); await expect(provider.search(input)).rejects.toMatchObject({ reason: "quota", requests_attempted: 0 });
  now -= 60_000; await expect(provider.search(input)).rejects.toMatchObject({ reason: "quota" });
  now += 120_000; await provider.search(input); now += 60_000;
  await expect(provider.search(input)).rejects.toMatchObject({ reason: "quota" }); expect(fetcher).toHaveBeenCalledTimes(2);
  now = Date.parse("2026-10-30T12:00:00Z"); await provider.search(input); expect(fetcher).toHaveBeenCalledTimes(3);
});
test.each([{ label: "malformed JSON", raw: "{" }, { label: "wrong type", raw: JSON.stringify({ type: "wrong", results: [] }) }, { label: "oversized body", raw: "x".repeat(500_001) }])("$label fails closed without caching", async ({ raw }) => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(raw));
  await expect(new BravePlaceSearch({ apiKey: "fixture", dailyLimit: 1, fetcher }).search(input)).rejects.toMatchObject({ reason: "invalid_response" });
});
test("invalid request and pre-abort consume no provider quota or network", async () => {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => response());
  const provider = new BravePlaceSearch({ apiKey: "fixture", dailyLimit: 1, fetcher });
  await expect(provider.search({ ...input, count: 101 })).rejects.toThrow("Invalid place search input");
  const controller = new AbortController(); controller.abort(); await expect(provider.search(input, controller.signal)).rejects.toBeDefined();
  expect(fetcher).not.toHaveBeenCalled();
});
