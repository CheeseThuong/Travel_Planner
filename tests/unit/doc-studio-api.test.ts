import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { GET as weather } from "@/app/api/v1/doc-weather/route";
import { GET as status } from "@/app/api/v1/doc-status/route";
import { parseServerEnv } from "@/lib/config/env.server";

const id = "a6ea84e9-2f58-49d7-87c3-eb5b82ac352e";
const request = (query = "") => new Request(`http://local.test/api/v1/doc-weather${query}`, { headers: { "x-request-id": id } });
const fixture = () => ({ current: { temperature_2m: 21, relative_humidity_2m: 80, weather_code: 1, time: "2026-10-30T12:00" },
  daily: { time: Array.from({ length: 7 }, (_, i) => `2026-11-0${i + 1}`), temperature_2m_max: Array(7).fill(24),
    temperature_2m_min: Array(7).fill(17), precipitation_sum: Array(7).fill(2), precipitation_probability_max: Array(7).fill(30), weather_code: Array(7).fill(1) } });

beforeEach(() => {
  vi.stubEnv("DEPLOYMENT_ENV", "local"); vi.stubEnv("CLOUD_ENABLED", "false");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", ""); vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  vi.stubEnv("DOC_WEATHER_ENABLED", "false"); vi.spyOn(console, "info").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unexpected live request")));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

test("weather is default OFF and makes no provider requests", async () => {
  expect(parseServerEnv({}).DOC_WEATHER_ENABLED).toBe(false);
  const response = await weather(request()); expect(response.status).toBe(503);
  expect(response.headers.get("x-request-id")).toBe(id); expect(response.headers.get("cache-control")).toBe("no-store");
  expect((await response.json()).error.code).toBe("PROVIDER_UNAVAILABLE"); expect(fetch).not.toHaveBeenCalled();
});
test.each(["?city=__proto__", "?city=hanoi", "?city=da-lat&city=nha-trang", "?url=https://evil.invalid"])("rejects unsupported or ambiguous queries %s", async query => {
  expect((await weather(request(query))).status).toBe(400); expect(fetch).not.toHaveBeenCalled();
});
test("normalizes seven fixture days and fixes provider URL, redirect and timeout policy", async () => {
  vi.stubEnv("DOC_WEATHER_ENABLED", "true"); vi.mocked(fetch).mockResolvedValue(Response.json(fixture()));
  const response = await weather(request("?city=nha-trang")), body = await response.json(); expect(response.status).toBe(200);
  expect(body.meta.request_id).toBe(id); expect(body.data.city).toBe("nha-trang"); expect(body.data.days).toHaveLength(7);
  expect(body.data.current).toEqual({ temperatureC: 21, humidity: 80, code: 1, observedLocal: "2026-10-30T12:00" });
  const [url, options] = vi.mocked(fetch).mock.calls[0]; expect(new URL(String(url)).origin).toBe("https://api.open-meteo.com");
  expect(options?.redirect).toBe("error"); expect(options?.signal).toBeInstanceOf(AbortSignal);
});
test.each(["null", "humidity", "short", "oversize", "provider"])("rejects malformed/unavailable provider data: %s", async mode => {
  vi.stubEnv("DOC_WEATHER_ENABLED", "true"); const data = fixture();
  if (mode === "humidity") data.current.relative_humidity_2m = 101;
  if (mode === "short") data.daily.time.pop();
  vi.mocked(fetch).mockResolvedValue(mode === "oversize" ? new Response("x".repeat(65537)) : mode === "provider" ? new Response(null, { status: 429 }) : Response.json(mode === "null" ? null : data));
  const response = await weather(request()); expect(response.status).toBe(503);
  const body = await response.json(); expect(body.error.code).toBe("PROVIDER_UNAVAILABLE"); expect(body.meta.request_id).toBe(id);
});
test("status distinguishes configuration from a working Auth/RLS connection and hides credentials", async () => {
  const disabled = await status(request()); expect((await disabled.json()).data.contributions).toBe("disabled");
  vi.stubEnv("CLOUD_ENABLED", "true"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.invalid"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "fixture-key");
  const configured = await status(request()), text = await configured.text();
  expect(JSON.parse(text).data.contributions).toBe("configured_not_verified"); expect(text).not.toMatch(/fixture-key|fixture.invalid/);
  expect(fetch).not.toHaveBeenCalled();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", ""); expect((await status(request())).status).toBe(503);
});
