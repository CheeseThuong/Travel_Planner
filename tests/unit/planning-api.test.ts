import { afterEach, expect, test, vi } from "vitest";
import { generate, apply } from "@/lib/api/planning.server";

afterEach(() => vi.restoreAllMocks());
const tripId = "d4100000-0000-4000-8000-000000000001";
const key = "d4400000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ tripId }) };
function request(body: string, headers = {}) { return new Request(`http://localhost/api/v1/trips/${tripId}/generate`, { method: "POST", body, headers: { "idempotency-key": key, ...headers } }); }
test("planning routes validate bounded JSON, IDs, explicit confirmation and ownership credentials", async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  expect((await generate(request("{"), context)).status).toBe(400);
  expect((await generate(request(JSON.stringify({ expected_version: 1, preserve_locked_stops: false })), context)).status).toBe(422);
  expect((await generate(request(JSON.stringify({ expected_version: 1 })), { params: Promise.resolve({ tripId: "invalid" }) })).status).toBe(422);
  expect((await generate(request(JSON.stringify({ expected_version: 1 })), context)).status).toBe(401);
  expect((await apply(request(JSON.stringify({ expected_version: 1, plan_run_id: key, confirmed: false })), context)).status).toBe(422);
  expect((await generate(request(" ".repeat(8193)), context)).status).toBe(413);
});
test("disabled storage does not call external providers or echo credentials", async () => {
  vi.stubEnv("CLOUD_ENABLED", "false");
  vi.spyOn(console, "info").mockImplementation(() => {});
  const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("No outbound call"));
  try {
    const response = await generate(request(JSON.stringify({ expected_version: 1 }), { authorization: "Bearer private-test-credential" }), context);
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("private-test-credential"); expect(network).not.toHaveBeenCalled();
  } finally { vi.unstubAllEnvs(); }
});

test.each([new TypeError("private-owner-token network failure"), new DOMException("private-owner-token deadline", "TimeoutError")])("upstream transport failures return a redacted unavailable envelope: %s", async (failure) => {
  vi.stubEnv("CLOUD_ENABLED", "true");
  vi.stubEnv("DEPLOYMENT_ENV", "local");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:35321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "fixture-public-key");
  const logs = vi.spyOn(console, "info").mockImplementation(() => {});
  const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(failure);
  try {
    const response = await generate(request(JSON.stringify({ expected_version: 1 }), { authorization: "Bearer private-owner-token", "x-request-id": key }), context);
    expect(response.status).toBe(503);
    expect(response.headers.get("x-request-id")).toBe(key);
    expect(await response.json()).toMatchObject({ error: { code: "PROVIDER_UNAVAILABLE", details: {} }, meta: { request_id: key } });
    expect(network).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(logs.mock.calls)).not.toContain("private-owner-token");
  } finally { vi.unstubAllEnvs(); }
});

test("planning routes enforce the process quota with the standard error contract", async () => {
  vi.resetModules();
  vi.spyOn(performance, "now").mockReturnValue(0);
  vi.spyOn(console, "info").mockImplementation(() => {});
  const isolated = await import("@/lib/api/planning.server");
  for (let attempt = 0; attempt < 20; attempt++) {
    expect((await isolated.generate(request(JSON.stringify({ expected_version: 1 })), context)).status).toBe(401);
  }
  const response = await isolated.generate(request(JSON.stringify({ expected_version: 1 }), { "x-request-id": key }), context);
  expect(response.status).toBe(429);
  expect(await response.json()).toMatchObject({ error: { code: "RATE_LIMITED", details: {} }, meta: { request_id: key } });
});
