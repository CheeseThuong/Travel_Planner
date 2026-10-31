import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, test } from "vitest";
import { createVerifiedOwnerDraftRepository } from "@/adapters/supabase/owner-drafts.server";
import { generate, apply } from "@/lib/api/planning.server";
import { plannerDraft, plannerStop } from "../fixtures/planner";
import type { EngineCandidate } from "@/domain/planning/engine";

const url = process.env.LOCAL_SUPABASE_URL!, key = process.env.LOCAL_SUPABASE_PUBLISHABLE_KEY!, marker = process.env.LOCAL_AUTH_TEST_MARKER!;
if (!url || !key || !marker) throw new Error("Local planning integration configuration missing");
const names = ["CLOUD_ENABLED", "DEPLOYMENT_ENV", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] as const;
const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
beforeAll(() => { Object.assign(process.env, { CLOUD_ENABLED: "true", DEPLOYMENT_ENV: "local", NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }); });
afterAll(() => { for (const name of names) if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; });
async function token() {
  const response = await fetch(new URL("/auth/v1/signup", url), { method: "POST", headers: { apikey: key, "content-type": "application/json" }, body: JSON.stringify({ data: { test_marker: marker } }) });
  if (!response.ok) throw new Error("Disposable anonymous session failed");
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("Disposable session token missing");
  return body.access_token;
}
const config = { url, publishableKey: key };
const context = (tripId: string) => ({ params: Promise.resolve({ tripId }) });
const request = (accessToken: string, body: object, idempotencyKey = randomUUID()) => new Request("http://127.0.0.1/planning-test", { method: "POST", headers: { authorization: `Bearer ${accessToken}`, "idempotency-key": idempotencyKey, "content-type": "application/json" }, body: JSON.stringify(body) });
async function setup(locked = false) {
  const accessToken = await token(), owner = await createVerifiedOwnerDraftRepository(config, accessToken), id = randomUUID();
  const draft = await owner.create(plannerDraft({ id, end_date: "2026-11-06", departure_local_time: "19:00", stops: [plannerStop(randomUUID(), { is_required: true, ...(locked ? { lock: { plan_date: "2026-11-06", start_local: "14:00", sort_index: 0 } } : {}) })] }), randomUUID());
  return { accessToken, owner, draft, ctx: context(id) };
}
async function rows(accessToken: string, tripId: string) {
  const response = await fetch(new URL(`/rest/v1/trip_stops?trip_id=eq.${tripId}&select=id,status,is_locked,plan_date,planned_start_local,sort_index`, url), { headers: { apikey: key, authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error("Disposable schedule read failed");
  return response.json() as Promise<{ id: string; status: string; is_locked: boolean; plan_date: string; planned_start_local: string; sort_index: number }[]>;
}

test("real Auth/RLS generate is separate, owner-isolated, idempotent; parallel apply changes version once", async () => {
  const { accessToken, owner, draft, ctx } = await setup(), other = await token(), generationKey = randomUUID();
  const generated = await generate(request(accessToken, { expected_version: 1 }, generationKey), ctx);
  expect(generated.status).toBe(200);
  const candidate = (await generated.json()).data as EngineCandidate;
  expect((await owner.load(draft.id))?.version).toBe(1); expect((await rows(accessToken, draft.id))[0].status).toBe("selected");
  const retry = await generate(request(accessToken, { expected_version: 1 }, generationKey), ctx);
  expect(retry.status).toBe(200); expect((await retry.json()).data.plan_run_id).toBe(candidate.plan_run_id);
  expect((await generate(request(accessToken, { expected_version: 1, seed: 43 }, generationKey), ctx)).status).toBe(409);
  expect((await generate(request("forged-owner-token", { expected_version: 1 }), ctx)).status).toBe(401);
  expect((await generate(request(other, { expected_version: 1 }), ctx)).status).toBe(404);
  expect((await apply(request(other, { expected_version: 1, plan_run_id: candidate.plan_run_id, confirmed: true }), ctx)).status).toBe(404);
  expect((await apply(request(accessToken, { expected_version: 1, plan_run_id: candidate.plan_run_id, confirmed: false }), ctx)).status).toBe(422);
  const applyKeys = [randomUUID(), randomUUID()], body = { expected_version: 1, plan_run_id: candidate.plan_run_id, confirmed: true };
  const results = await Promise.all(applyKeys.map((applyKey) => apply(request(accessToken, body, applyKey), ctx)));
  expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
  const successfulKey = applyKeys[results.findIndex((result) => result.status === 200)];
  expect((await apply(request(accessToken, body, successfulKey), ctx)).status).toBe(200);
  expect((await owner.load(draft.id))?.version).toBe(2);
  const applied = await rows(accessToken, draft.id);
  expect(applied).toHaveLength(1); expect(applied[0]).toMatchObject({ id: draft.stops[0].id, status: "scheduled", is_locked: false });
  expect(await rows(other, draft.id)).toEqual([]);
}, 30_000);

test("real zero-selection candidate applies without inventing or losing stops", async () => {
  const { accessToken, owner, draft, ctx } = await setup();
  expect((await owner.saveWithKey({ ...draft, stops: [] }, 1, randomUUID())).status).toBe("saved");
  const generated = await generate(request(accessToken, { expected_version: 2 }), ctx);
  expect(generated.status).toBe(200);
  const candidate = (await generated.json()).data as EngineCandidate;
  expect(candidate.days).toHaveLength(1);
  expect(candidate.days[0].stops).toEqual([]);
  expect(candidate.unscheduled).toEqual([]);
  expect((await apply(request(accessToken, { expected_version: 2, plan_run_id: candidate.plan_run_id, confirmed: true }), ctx)).status).toBe(200);
  expect(await rows(accessToken, draft.id)).toEqual([]);
  expect((await owner.load(draft.id))?.version).toBe(3);
}, 30_000);
test("editing input makes old candidates stale without mutating selected stops", async () => {
  const { accessToken, owner, draft, ctx } = await setup();
  const generated = await generate(request(accessToken, { expected_version: 1 }), ctx);
  expect(generated.status).toBe(200); const candidate = (await generated.json()).data as EngineCandidate;
  expect((await owner.saveWithKey({ ...draft, title: "Changed fixture" }, 1, randomUUID())).status).toBe("saved");
  const stale = await apply(request(accessToken, { expected_version: 2, plan_run_id: candidate.plan_run_id, confirmed: true }), ctx);
  expect(stale.status).toBe(409); expect((await stale.json()).error.code).toBe("PLAN_RUN_STALE");
  expect((await generate(request(accessToken, { expected_version: 1 }), ctx)).status).toBe(409);
  expect((await rows(accessToken, draft.id))[0].status).toBe("selected");
}, 30_000);
test("owner-private candidate tampering is rejected by engine equivalence before HTTP apply", async () => {
  const { accessToken, owner, draft, ctx } = await setup();
  const generated = await generate(request(accessToken, { expected_version: 1 }), ctx);
  expect(generated.status).toBe(200); const candidate = (await generated.json()).data as EngineCandidate;
  const forged = { ...candidate, plan_run_id: randomUUID(), warnings: [...candidate.warnings, "FORGED_FIXTURE"] };
  expect((await owner.storeCandidate(draft.id, 1, randomUUID(), forged)).status).toBe("candidate");
  const rejected = await apply(request(accessToken, { expected_version: 1, plan_run_id: forged.plan_run_id, confirmed: true }), ctx);
  expect(rejected.status).toBe(409); expect((await rejected.json()).error.code).toBe("PLAN_RUN_STALE");
  expect((await owner.load(draft.id))?.version).toBe(1);
}, 30_000);
test("real apply preserves selected order, required flags, locks and explicitly unscheduled stops", async () => {
  const { accessToken, owner, draft, ctx } = await setup(true);
  const input = { ...draft, stops: [...draft.stops, plannerStop(randomUUID(), { is_required: true, transport_constraint: "manual_transfer" }), plannerStop(randomUUID())] };
  expect((await owner.saveWithKey(input, 1, randomUUID())).status).toBe("saved");
  const generated = await generate(request(accessToken, { expected_version: 2 }), ctx);
  expect(generated.status).toBe(200); const candidate = (await generated.json()).data as EngineCandidate;
  expect(candidate.unscheduled).toContainEqual({ stop_id: input.stops[1].id, reason: "UNREACHABLE", message: "MANUAL_TRANSFER_REQUIRED" });
  expect(candidate.unfulfilled_required).toEqual([input.stops[1].id]);
  expect((await apply(request(accessToken, { expected_version: 2, plan_run_id: candidate.plan_run_id, confirmed: true }), ctx)).status).toBe(200);
  const stored = await owner.load(draft.id);
  expect(stored?.version).toBe(3);
  expect(stored?.stops).toEqual(input.stops);
  const applied = await rows(accessToken, draft.id);
  expect(applied).toHaveLength(3);
  expect(applied.find(stop => stop.id === input.stops[0].id)).toMatchObject({ is_locked: true, plan_date: "2026-11-06", planned_start_local: "14:00:00", sort_index: 0 });
  expect(applied.find(stop => stop.id === input.stops[1].id)?.status).toBe("unscheduled");
}, 30_000);
