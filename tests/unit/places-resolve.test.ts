import { afterEach, expect, test, vi } from "vitest";
import { POST } from "@/app/api/v1/places/resolve/route";
import { createRequestLimiter } from "@/lib/api/request-limit.server";

afterEach(() => { vi.restoreAllMocks(); });
const request = (body: string) => new Request("http://localhost/api/v1/places/resolve", { method: "POST", body, headers: { "x-request-id": "a6ea84e9-2f58-49d7-87c3-eb5b82ac352e" } });
test("resolve validates syntax/schema/unsafe URLs and preserves redacted error contracts", async () => {
  const logs = vi.spyOn(console, "info").mockImplementation(() => {});
  for (const [body, status, code] of [
    ["{", 400, "VALIDATION_ERROR"],
    [JSON.stringify({ url: "https://www.google.com/maps?q=x", destination_slug: "invalid" }), 422, "VALIDATION_ERROR"],
    [JSON.stringify({ url: "https://localhost/maps?private=secret", destination_slug: "da-lat" }), 400, "UNSUPPORTED_URL"],
  ] as const) {
    const response = await POST(request(body));
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ error: { code, details: {} }, meta: { request_id: "a6ea84e9-2f58-49d7-87c3-eb5b82ac352e" } });
  }
  expect(JSON.stringify(logs.mock.calls)).not.toContain("secret");
});
test("no-key endpoint returns confirmable independent candidates or explicit manual fallback", async () => {
  const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("No outbound network"));
  const response = await POST(request(JSON.stringify({ url: "https://www.google.com/maps?query=Ch%E1%BB%A3", destination_slug: "da-lat" })));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.data.status).toBe("candidate_selection_required");
  expect(body.data.candidates.length).toBeGreaterThan(0);
  expect(body.data.candidates[0]).toMatchObject({ provider: "editorial", editorial_place_id: expect.any(String) });
  expect(response.headers.get("cache-control")).toBe("no-store");
  const short = await POST(request(JSON.stringify({ url: "https://maps.app.goo.gl/opaque", destination_slug: "da-lat" })));
  expect((await short.json()).data).toEqual({ status: "manual_entry_required", candidates: [], manual_entry_available: true });
  expect(network).not.toHaveBeenCalled();
});
test("bounded instance-wide limiter rejects excess and resets at window boundary", () => {
  let now = 0;
  const limit = createRequestLimiter(2, 1000, () => now);
  limit(); limit();
  expect(limit).toThrow("Vui lòng thử lại sau");
  now = 1000;
  expect(limit).not.toThrow();
});

test("route bounds request body and returns actual429 after the process quota", async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  expect((await POST(request(" ".repeat(8193)))).status).toBe(413);
  let response: Response | undefined;
  for (let index = 0; index < 61; index++) response = await POST(request(JSON.stringify({ url: "https://maps.app.goo.gl/opaque", destination_slug: "da-lat" })));
  expect(response?.status).toBe(429);
  expect(await response?.json()).toMatchObject({ error: { code: "RATE_LIMITED" }, meta: { request_id: expect.any(String) } });
});
