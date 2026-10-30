import { afterEach, expect, test, vi } from "vitest";
import { createContributionHandlers } from "@/lib/api/contributions.server";
import { verifiedContributions } from "@/adapters/supabase/contributions.server";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.useRealTimers(); });
const id = "f5100000-0000-4000-8000-000000000001";
const input = { destination_slug: "da-lat", title: "Original fixture pin", description: "Original user-owned fixture", address: null, location: { lat: 11.94, lng: 108.45 }, categories: ["nature"], tags: [], suggested_duration_min: 60, transport_constraint: "access_unverified", source: "original_user_contribution", rights_confirmed: true };
function setup() { vi.stubEnv("CLOUD_ENABLED", "true"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:35321"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "fixture-publishable"); }
function request(body: unknown = input, extra: Record<string, string> = {}) { return new Request("http://localhost/api/v1/contributions", { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json", "idempotency-key": id, cookie: "travel_contributor=fixture-private-token", ...extra }, body: typeof body === "string" ? body : JSON.stringify(body) }); }
function provider(result: unknown, authStatus = 200) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (path) => {
    const url = new URL(String(path));
    if (url.pathname === "/auth/v1/user") return Response.json({ id, is_anonymous: true }, { status: authStatus });
    if (url.pathname.endsWith("contribution_session_info")) return Response.json({ moderator: false });
    return Response.json(result);
  });
}
test("validation, origin, auth, size, default-OFF and instance limits use redacted envelopes", async () => {
  vi.spyOn(console, "info").mockImplementation(() => {}); setup();
  const network = provider({}), api = createContributionHandlers();
  for (const [body, extra, expected] of [
    [input, { origin: "https://attacker.invalid" }, 403], [input, { origin: "" }, 403], [input, { "sec-fetch-site": "cross-site" }, 403],
    [input, { "content-type": "text/plain" }, 400], ["{", {}, 400], [" ".repeat(8193), {}, 413],
    [{ ...input, status: "approved" }, {}, 422], [{ ...input, rights_confirmed: false }, {}, 422], [input, { "idempotency-key": "bad" }, 422], [input, { cookie: "" }, 401],
  ] as const) {
    const response = await api.submit(request(body, extra)); expect(response.status).toBe(expected);
    const raw = await response.text(); expect(raw).not.toContain("fixture-private-token"); expect(raw).not.toContain("fixture-publishable");
    expect(response.headers.get("cache-control")).toBe("no-store"); expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  }
  expect(network).not.toHaveBeenCalled();
  vi.stubEnv("CLOUD_ENABLED", "false"); expect((await api.submit(request())).status).toBe(503); expect(network).not.toHaveBeenCalled();
  const limited = createContributionHandlers();
  for (let count = 0; count < 100; count++) await limited.session(new Request("http://localhost/api/v1/contributions/session"));
  expect((await limited.session(new Request("http://localhost/api/v1/contributions/session"))).status).toBe(429);
});
test("mutation outcomes, provider failures and malformed responses preserve status/business boundaries", async () => {
  setup(); vi.spyOn(console, "info").mockImplementation(() => {});
  for (const [result, expected] of [
    [{ status: "submitted", id, version: 1, state: "submitted" }, 201], [{ status: "replayed", id, version: 2, state: "verification" }, 201],
    [{ status: "version_conflict", current_version: 2 }, 409], [{ status: "idempotency_conflict" }, 409], [{ status: "rate_limited" }, 429],
    [{ status: "not_found" }, 404], [{ status: "transition_denied" }, 403], [{ status: "approved", owner_id: "private" }, 503],
  ] as const) {
    provider(result); const response = await createContributionHandlers().submit(request()); expect(response.status).toBe(expected); vi.restoreAllMocks();
  }
  provider({}, 403); expect((await createContributionHandlers().submit(request())).status).toBe(401); vi.restoreAllMocks();
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fixture-private-token sensitive provider body"));
  const failed = await createContributionHandlers().submit(request()); expect(failed.status).toBe(503); expect(await failed.text()).not.toContain("sensitive"); vi.restoreAllMocks();
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("x".repeat(500001)));
  expect((await createContributionHandlers().submit(request())).status).toBe(503);
});
test("only verified owner list and explicit moderator scope reach fixed provider paths", async () => {
  setup();
  const fetcher = provider([]), api = createContributionHandlers();
  const mine = await api.list(new Request("http://localhost/api/v1/contributions?destination_slug=da-lat", { headers: { authorization: "Bearer fixture-private-token" } }));
  expect(mine.status).toBe(200);
  const query = new URL(String(fetcher.mock.calls.at(-1)?.[0])); expect(query.pathname).toBe("/rest/v1/place_submissions"); expect(query.searchParams.get("owner_id")).toBe(`eq.${id}`); expect(query.searchParams.get("limit")).toBe("20");
  const review = await api.list(new Request("http://localhost/api/v1/contributions?destination_slug=da-lat&scope=review", { headers: { authorization: "Bearer fixture-private-token" } })); expect(review.status).toBe(403);
  const repeated = await api.list(new Request("http://localhost/api/v1/contributions?destination_slug=da-lat&destination_slug=nha-trang")); expect(repeated.status).toBe(422);
  const unknown = await api.publicList(new Request("http://localhost/api/v1/community-places?destination_slug=constructor")); expect(unknown.status).toBe(422);
});
test("session creation sets scoped HttpOnly strict cookie; valid existing session is reused", async () => {
  setup(); const fetcher = provider({ access_token: "fixture-private-token" }), api = createContributionHandlers();
  const response = await api.startSession(request({}, { cookie: "" })); expect(response.status).toBe(200);
  const cookie = response.headers.get("set-cookie") ?? ""; expect(cookie.includes("HttpOnly")).toBe(true); expect(cookie.includes("SameSite=Strict")).toBe(true); expect(cookie.includes("Path=/api/v1/contributions")).toBe(true); expect(cookie.includes("Expires=")).toBe(false);
  expect((await response.json()).data).toEqual({ moderator: false });
  expect(fetcher.mock.calls.filter(([path]) => String(path).endsWith("/signup"))).toHaveLength(1);
  const reuse = await api.startSession(request({})); expect(reuse.status).toBe(200); expect(reuse.headers.has("set-cookie")).toBe(false);
  expect(fetcher.mock.calls.filter(([path]) => String(path).endsWith("/signup"))).toHaveLength(1);
  const owner = await verifiedContributions({ url: "http://127.0.0.1:35321", publishableKey: "fixture-publishable" }, "fixture-private-token"); expect(owner.moderator).toBe(false);
});

test("same-origin browser writes accept the received Host when Next uses an internal URL; forwarded hosts cannot bypass CSRF", async () => {
  setup(); provider({ status: "submitted", id, version: 1, state: "submitted" });
  const api = createContributionHandlers();
  expect((await api.submit(request(input, { host: "127.0.0.1:3397", origin: "http://127.0.0.1:3397" }))).status).toBe(201);
  expect((await api.submit(request(input, { host: "127.0.0.1:3397", origin: "https://attacker.invalid", "x-forwarded-host": "attacker.invalid" }))).status).toBe(403);
  expect((await api.submit(request(input, { host: "attacker.invalid/path", origin: "http://attacker.invalid" }))).status).toBe(403);
});

test("bounded provider timeout and unexpected configuration failure are redacted", async () => {
  setup(); vi.useFakeTimers(); vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation((_url, options) => new Promise((_resolve, reject) => options?.signal?.addEventListener("abort", () => reject(new Error("Private provider timeout details")))));
  const pending = createContributionHandlers().submit(request()); await vi.advanceTimersByTimeAsync(10001);
  const timedOut = await pending; expect(timedOut.status).toBe(503); expect(await timedOut.text()).not.toContain("Private provider");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://private-token@invalid.example");
  const invalid = await createContributionHandlers().submit(request()); expect(invalid.status).toBe(500); expect(await invalid.text()).not.toContain("private-token");
});
