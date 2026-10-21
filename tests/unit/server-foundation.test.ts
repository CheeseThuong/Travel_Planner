import { afterEach, expect, test, vi } from "vitest";
import { z } from "zod";
import { parseServerEnv } from "@/lib/config/env.server";
import { logEvent } from "@/lib/telemetry/events.server";
import { readJson, withApi } from "@/lib/api/http.server";
import { GET } from "@/app/api/v1/health/route";

afterEach(() => vi.restoreAllMocks());
const id = "a6ea84e9-2f58-49d7-87c3-eb5b82ac352e";

test("no-key local configuration leaves live and cloud flags off", () => {
  const env = parseServerEnv({}); expect(env.CLOUD_ENABLED).toBe(false); expect(env.GOOGLE_MAPS_LIVE_ENABLED).toBe(false);
});
test("partial cloud, production without cloud and unsafe URLs are rejected without exposing values", () => {
  for (const env of [{ CLOUD_ENABLED: "true" }, { DEPLOYMENT_ENV: "production" }, { NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid" }, { NEXT_PUBLIC_SUPABASE_URL: "https://private-token@example.invalid", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-test-key" }]) expect(() => parseServerEnv(env)).toThrow("Invalid server configuration");
  try { parseServerEnv({ GOOGLE_MAPS_SERVER_KEY: { secret: "sensitive-test-value" } }); throw new Error("Expected rejection"); }
  catch (error) { expect(String(error)).not.toContain("sensitive-test-value"); }
});
test("Google live requires explicit credentials and a positive bounded budget", () => {
  expect(() => parseServerEnv({ GOOGLE_MAPS_LIVE_ENABLED: "true", GOOGLE_MAPS_SERVER_KEY: "fixture-not-a-real-key" })).toThrow();
  expect(parseServerEnv({ GOOGLE_MAPS_LIVE_ENABLED: "true", GOOGLE_MAPS_SERVER_KEY: "fixture-not-a-real-key", GOOGLE_MAPS_DAILY_BUDGET_MINOR: "10" }).GOOGLE_MAPS_LIVE_ENABLED).toBe(true);
  expect(() => parseServerEnv({ GOOGLE_MAPS_DAILY_BUDGET_MINOR: "-1" })).toThrow();
});
test("telemetry strips sensitive fields and rejects arbitrary event/code/request-id strings", () => {
  const sink = vi.fn(); logEvent({ event: "api_error", request_id: id, code: "INTERNAL_ERROR", status: 500, share_code: "sensitive-share", hotel: "private hotel", url: "https://secret.invalid" }, sink);
  expect(sink).toHaveBeenCalledTimes(1); expect(sink.mock.calls[0][0]).not.toMatch(/sensitive|private hotel|secret\.invalid/);
  logEvent({ event: "private-hotel", request_id: id, status: 500 }, sink);
  logEvent({ event: "api_error", request_id: "sensitive-share", status: 500 }, sink); expect(sink).toHaveBeenCalledTimes(1);
});
test("health returns an envelope/UUID without backend details or spoofed token request IDs", async () => {
  const response = await GET(new Request("http://local.test/api/v1/health", { headers: { "x-request-id": id } }));
  expect(response.status).toBe(200); expect(await response.json()).toEqual({ data: { status: "ok" }, meta: { request_id: id } });
  const spoofed = await GET(new Request("http://local.test/api/v1/health", { headers: { "x-request-id": "NT-SENSITIVE-TOKEN" } }));
  expect(spoofed.headers.get("x-request-id")).not.toBe("NT-SENSITIVE-TOKEN"); expect(z.uuid().safeParse(spoofed.headers.get("x-request-id")).success).toBe(true);
});
test.each([["{",400], ['{"count":-1}',422], ['{"count":1}',200]])("JSON contract distinguishes malformed/schema/valid input %s", async (body, status) => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  const request = new Request("http://local.test", { method: "POST", body });
  const response = await withApi(request, async () => { await readJson(request, z.object({ count: z.number().positive() })); return new Response(null, { status: 200 }); });
  expect(response.status).toBe(status);
});
test("bounded input rejects a body without relying on Content-Length", async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  const request = new Request("http://local.test", { method: "POST", body: "x".repeat(100) });
  const response = await withApi(request, async () => { await readJson(request, z.unknown(), 16); return new Response(); }); expect(response.status).toBe(413);
});
test("unknown exceptions return a generic envelope and emit no exception payload", async () => {
  const sink = vi.spyOn(console, "info").mockImplementation(() => {});
  const response = await withApi(new Request("http://local.test"), () => { throw new Error("secret-owner-token private-hotel"); });
  expect(response.status).toBe(500); expect(await response.text()).not.toMatch(/secret-owner-token|private-hotel/);
  expect(JSON.stringify(sink.mock.calls)).not.toMatch(/secret-owner-token|private-hotel/);
});
