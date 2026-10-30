import { randomUUID } from "node:crypto";
import { expect, test, vi } from "vitest";
import { communityPlaces, ContributionAccessError, verifiedContributions } from "@/adapters/supabase/contributions.server";
import { createContributionHandlers } from "@/lib/api/contributions.server";
import type { ContributionInput } from "@/domain/discovery/contribution";

const url = process.env.LOCAL_SUPABASE_URL, publishableKey = process.env.LOCAL_SUPABASE_PUBLISHABLE_KEY, marker = process.env.LOCAL_AUTH_TEST_MARKER, moderatorToken = process.env.LOCAL_CONTRIBUTION_MODERATOR_TOKEN;
if (!url || !publishableKey || !marker || !moderatorToken) throw new Error("Disposable contribution test configuration missing");
const config = { url, publishableKey };
async function session() {
  const response = await fetch(new URL("/auth/v1/signup", url), { method: "POST", headers: { apikey: publishableKey!, "Content-Type": "application/json" }, body: JSON.stringify({ data: { test_marker: marker, role: "moderator" } }) });
  if (!response.ok) throw new Error("Disposable contribution signup failed");
  const result = await response.json() as { access_token?: unknown };
  if (typeof result.access_token !== "string") throw new Error("Disposable contribution token missing");
  return result.access_token;
}
const payload = (): ContributionInput => ({ destination_slug: "da-lat", title: `Original local test ${randomUUID()}`, description: "Original test text with permission", address: null, location: { lat: 11.94, lng: 108.45 }, categories: ["nature"], tags: [], suggested_duration_min: 60, transport_constraint: "access_unverified", source: "original_user_contribution", rights_confirmed: true });

test("real Auth owners and moderator exercise private submission, publication, revocation, restore and durable quota", async () => {
  const [tokenA, tokenB] = await Promise.all([session(), session()]);
  const [a, b, moderator] = await Promise.all([verifiedContributions(config, tokenA), verifiedContributions(config, tokenB), verifiedContributions(config, moderatorToken)]);
  expect(a.moderator).toBe(false); expect(b.moderator).toBe(false); expect(moderator.moderator).toBe(true);
  await expect(verifiedContributions(config, "forged-token")).rejects.toMatchObject({ code: "unauthorized" });
  await expect(b.list("da-lat", true)).rejects.toMatchObject({ code: "forbidden" });
  const input = payload(), key = randomUUID(), created = await a.submit(input, key);
  if (!("id" in created)) throw new Error("Expected submitted record");
  expect(created).toMatchObject({ status: "submitted", state: "submitted", version: 1 });
  expect(await a.submit(input, key)).toMatchObject({ status: "replayed", id: created.id });
  expect(await a.submit({ ...input, title: "Changed retry" }, key)).toEqual({ status: "idempotency_conflict" });
  const rows = await a.list("da-lat"); expect(rows).toHaveLength(1); expect(rows[0].payload).toEqual(input);
  expect(await b.list("da-lat")).toEqual([]); expect(await b.transition(created.id, 1, "withdraw", "")).toEqual({ status: "not_found" });
  expect(await a.transition(created.id, 1, "approve", "Owner escalation attempt")).toEqual({ status: "transition_denied" });
  expect(await communityPlaces(config, "da-lat", 0)).toEqual([]);
  expect((await moderator.list("da-lat", true)).some(row => row.id === created.id)).toBe(true);
  expect(await moderator.transition(created.id, 1, "verify", "")).toMatchObject({ state: "verification", version: 2 });
  expect(await moderator.transition(created.id, 1, "approve", "Old review")).toMatchObject({ status: "version_conflict", current_version: 2 });
  expect(await moderator.transition(created.id, 2, "approve", "Reviewed original source and pin")).toMatchObject({ state: "approved", version: 3 });
  const publicRows = await communityPlaces(config, "da-lat", 0); expect(publicRows).toHaveLength(1);
  expect(publicRows[0]).toMatchObject({ id: created.id, moderation: "community_reviewed", hours: { state: "hours_unknown" }, price: { state: "unknown" } });
  expect(JSON.stringify(publicRows)).not.toContain("owner_id"); expect(JSON.stringify(publicRows)).not.toContain("Reviewed original");
  expect((await a.list("da-lat"))[0].latest_note).toBe("Reviewed original source and pin");
  expect(await a.transition(created.id, 3, "withdraw", "")).toMatchObject({ state: "withdrawn", version: 4 });
  expect(await communityPlaces(config, "da-lat", 0)).toEqual([]);
  expect(await a.transition(created.id, 4, "restore", "")).toMatchObject({ state: "submitted", version: 5 });
  expect(await moderator.transition(created.id, 5, "reject", "Duplicate fixture rejection")).toMatchObject({ state: "rejected", version: 6 });
  expect((await a.list("da-lat"))[0].latest_note).toBe("Duplicate fixture rejection");
  expect(await moderator.transition(created.id, 6, "restore", "")).toMatchObject({ state: "verification", version: 7 });
  const writes = await Promise.all(Array.from({ length: 5 }, () => a.submit(payload(), randomUUID())));
  expect(writes.filter(row => row.status === "submitted")).toHaveLength(4); expect(writes.filter(row => row.status === "rate_limited")).toHaveLength(1);
});

test("HTTP cookie boundaries use actual verified Auth/RLS and redact upstream failures", async () => {
  vi.stubEnv("CLOUD_ENABLED", "true"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url); vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishableKey);
  try {
    const tokenA = await session(), tokenB = await session(), api = createContributionHandlers(), input = payload();
    const request = (body: unknown, token = tokenA) => new Request("http://localhost/api/v1/contributions", { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json", "idempotency-key": randomUUID(), cookie: `travel_contributor=${token}` }, body: JSON.stringify(body) });
    const submitted = await api.submit(request(input)); expect(submitted.status).toBe(201);
    const result = (await submitted.json()).data as { id: string };
    const failed = await api.transition(request({ expected_version: 1, action: "withdraw" }, tokenB), { params: Promise.resolve({ submissionId: result.id }) });
    expect(failed.status).toBe(404); expect(await failed.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
    const forged = await api.submit(request(payload(), "forged-token")); expect(forged.status).toBe(401);
    expect(await forged.text()).not.toContain("forged-token");
    const csrf = request(payload()); csrf.headers.set("origin", "https://attacker.invalid"); expect((await api.submit(csrf)).status).toBe(403);
    const user = await api.session(new Request("http://localhost/api/v1/contributions/session", { headers: { cookie: `travel_contributor=${tokenA}` } }));
    expect(user.status).toBe(200); expect((await user.json()).data).toEqual({ moderator: false });
    const started = await api.startSession(new Request("http://localhost/api/v1/contributions/session", { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: "{}" }));
    const cookie = started.headers.get("set-cookie") ?? "", issuedToken = /^travel_contributor=([^;]+)/.exec(cookie)?.[1];
    if (issuedToken) {
      const marked = await fetch(new URL("/auth/v1/user", url), { method: "PUT", headers: { apikey: publishableKey!, authorization: `Bearer ${issuedToken}`, "content-type": "application/json" }, body: JSON.stringify({ data: { test_marker: marker } }) });
      if (!marked.ok) throw new Error("Could not mark test-owned session for cleanup");
    }
    expect(started.status).toBe(200); expect(Boolean(issuedToken)).toBe(true); expect(cookie.includes("HttpOnly")).toBe(true); expect(cookie.includes("SameSite=Strict")).toBe(true);
    expect((await started.json()).data).toEqual({ moderator: false });
  } catch (error) { if (error instanceof ContributionAccessError) throw new Error(`Redacted contribution upstream failure: ${error.code}`); throw error; }
  finally { vi.unstubAllEnvs(); }
});
