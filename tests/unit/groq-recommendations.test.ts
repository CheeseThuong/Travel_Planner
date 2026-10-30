import { afterEach, describe, expect, test, vi } from "vitest";
import { GroqRecommendations, type GroqOptions } from "@/adapters/recommendations/groq.server";
import type { RankingCandidate, RankingPreferences } from "@/domain/ports/recommendations";
import { parseServerEnv } from "@/lib/config/env.server";

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
const preferences: RankingPreferences = { day_count: 2, party_size: 2, pace: "balanced", transport_mode: "walk", interests: ["nature"], budget_band: "unspecified", food_preference: "any", accommodation_preference: "any", time_of_day: "any" };
const candidates: RankingCandidate[] = [{ id: "f6010000-0000-4000-8000-000000000001", categories: ["nature"], distance_from_center_km: 2.123, is_required: true, retention: "open_license" }, { id: "f6010000-0000-4000-8000-000000000002", categories: ["landmarks"], distance_from_center_km: 15, is_required: false, retention: "user_owned" }];
const options: GroqOptions = { apiKey: "fixture-server-secret", model: "openai/gpt-oss-20b", costControlsApproved: true, zdrConfirmed: true, dailyRequestLimit: 10, minuteRequestLimit: 5, dailyTokenLimit: 1_000_000, dailyBudgetMicroUsd: 1_000_000, inputUsdPerMillion: 1, outputUsdPerMillion: 2, maxCompletionTokens: 512 };
const ordered = [{ id: "f6010000-0000-4000-8000-000000000002", reason: "experience_variety" }, { id: "f6010000-0000-4000-8000-000000000001", reason: "preference_match" }];
const envelope = (content: unknown = { ordered }) => ({ model: options.model, choices: [{ finish_reason: "stop", message: { content: JSON.stringify(content) } }] });
const fetcher = (value: unknown = envelope()) => vi.fn<typeof fetch>().mockResolvedValue(Response.json(value));

test("strict known-ID ranking uses fixed server transport and only non-private bounded summaries", async () => {
  const transport = fetcher(), original = structuredClone(candidates), provider = new GroqRecommendations({ ...options, fetcher: transport });
  const result = await provider.rank(preferences, candidates);
  expect(result.ordered).toEqual(ordered); expect(result.usage.requests_attempted).toBe(1); expect(candidates).toEqual(original);
  expect(transport).toHaveBeenCalledTimes(1);
  const [url, init] = transport.mock.calls[0]; expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
  expect(init).toMatchObject({ method: "POST", redirect: "error", cache: "no-store", headers: { Authorization: "Bearer fixture-server-secret" } });
  const body = JSON.parse(String(init?.body)); expect(body).toMatchObject({ model: options.model, stream: false, max_completion_tokens: 512, reasoning_effort: "low", include_reasoning: false, response_format: { type: "json_schema", json_schema: { strict: true } } });
  expect(body.response_format.json_schema.schema.properties.ordered.items.properties.id.enum).toEqual(["f6010000-0000-4000-8000-000000000001", "f6010000-0000-4000-8000-000000000002"]);
  expect(JSON.parse(body.messages[1].content).candidates[0]).toEqual({ id: "f6010000-0000-4000-8000-000000000001", categories: ["nature"], distance_from_center_km: 2.1, is_required: true });
  for (const forbidden of ["fixture-server-secret", "retention", "location", "address", "title", "start_date", "base_location"]) expect(String(init?.body)).not.toContain(`"${forbidden}"`);
  const bytes = new TextEncoder().encode(String(init?.body)).byteLength;
  expect(result.usage.reserved_tokens).toBe(bytes + 512 + 512);
  expect(result.usage.reserved_cost_micro_usd).toBe(Math.ceil((bytes + 512) * 1 + 512 * 2));
});

describe("schema plus independent identity/fact validation", () => {
  test.each([
    { ordered: [{ id: "f6010000-0000-4000-8000-000000000099", reason: "general_suggestion" }, ordered[1]] },
    { ordered: [ordered[1], ordered[1]] }, { ordered: [ordered[0]] },
    { ordered: [{ ...ordered[0], lat: 12.2 }, ordered[1]] }, { ordered, route_time: 10 },
    { ordered: [{ id: "f6010000-0000-4000-8000-000000000002", reason: "preference_match" }, ordered[1]] },
    { ordered: [{ id: "f6010000-0000-4000-8000-000000000002", reason: "geographic_proximity" }, ordered[1]] },
    { ordered: [{ ...ordered[0], reason: "verified_open" }, ordered[1]] },
  ])("rejects unknown/omitted/repeated IDs, invented facts or unsupported reasoning: %j", async value => {
    const transport = fetcher(envelope(value)), provider = new GroqRecommendations({ ...options, fetcher: transport });
    await expect(provider.rank(preferences, candidates)).rejects.toMatchObject({ reason: "invalid_response", requests_attempted: 1 }); expect(transport).toHaveBeenCalledTimes(1);
  });
  test.each([
    { model: options.model, choices: [{ finish_reason: "length", message: { content: JSON.stringify({ ordered }) } }] },
    { model: options.model, choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ ordered }), refusal: "cannot comply" } }] },
    { model: "retired-model", choices: envelope().choices }, { model: options.model, choices: [{ finish_reason: "stop", message: { content: "{" } }] },
  ])("rejects refusal, truncation, changed model and malformed JSON: %j", async value => {
    await expect(new GroqRecommendations({ ...options, fetcher: fetcher(value) }).rank(preferences, candidates)).rejects.toMatchObject({ reason: "invalid_response" });
  });
});

test("0/1 candidates need no network, while2/30 use the same bounded known-ID contract", async () => {
  const transport = vi.fn<typeof fetch>(), provider = new GroqRecommendations({ ...options, fetcher: transport });
  expect((await provider.rank(preferences, [])).usage.requests_attempted).toBe(0);
  expect((await provider.rank(preferences, [candidates[0]])).ordered).toEqual([{ id: "f6010000-0000-4000-8000-000000000001", reason: "general_suggestion" }]); expect(transport).not.toHaveBeenCalled();
  const many = Array.from({ length: 30 }, (_, index) => ({ ...candidates[0], id: `f6020000-0000-4000-8000-${String(index).padStart(12,"0")}` }));
  transport.mockResolvedValue(Response.json(envelope({ ordered: many.map(place => ({ id: place.id, reason: "general_suggestion" })) })));
  expect((await provider.rank(preferences, many)).ordered).toHaveLength(30); expect(transport).toHaveBeenCalledTimes(1);
});
test("refuses restricted/private/oversized input before reserving or dispatching", async () => {
  const transport = fetcher(), provider = new GroqRecommendations({ ...options, fetcher: transport });
  const unsafe = [{ ...candidates[0], retention: "request_only" }];
  await expect(provider.rank(preferences, unsafe as unknown as RankingCandidate[])).rejects.toThrow("Invalid bounded ranking input");
  await expect(provider.rank({ ...preferences, address: "private user address" } as RankingPreferences, candidates)).rejects.toThrow("Invalid bounded ranking input");
  await expect(provider.rank(preferences, [...candidates, candidates[0]])).rejects.toThrow("Invalid bounded ranking input");
  await expect(provider.rank(preferences, Array.from({ length: 31 }, (_, index) => ({ ...candidates[0], id: `f6020000-0000-4000-8000-${String(index).padStart(12,"0")}` })))).rejects.toThrow("Invalid bounded ranking input");
  expect(transport).not.toHaveBeenCalled();
});
test("snapshots caller inputs before awaiting external ranking", async () => {
  let deliver: (value: Response) => void = () => {};
  const transport = vi.fn<typeof fetch>().mockImplementation(() => new Promise(resolve => { deliver = resolve; }));
  const mutable = structuredClone(candidates), promise = new GroqRecommendations({ ...options, fetcher: transport }).rank(preferences, mutable);
  mutable[0] = { ...mutable[0], id: "changed-after-request" }; deliver(Response.json(envelope()));
  expect((await promise).ordered).toEqual(ordered);
});
test("minute/day/token/cost reservation happens before dispatch and failed requests are never refunded or retried", async () => {
  let now = Date.UTC(2026, 9, 30, 10);
  const transport = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({}, { status: 429 }));
  const provider = new GroqRecommendations({ ...options, minuteRequestLimit: 1, dailyRequestLimit: 2, now: () => now, fetcher: transport });
  await expect(provider.rank(preferences, candidates)).rejects.toMatchObject({ reason: "quota", requests_attempted: 1 });
  await expect(provider.rank(preferences, candidates)).rejects.toMatchObject({ reason: "quota", requests_attempted: 0 }); expect(transport).toHaveBeenCalledTimes(1);
  now += 60_001; await expect(provider.rank(preferences, candidates)).rejects.toMatchObject({ requests_attempted: 1 });
  now += 60_001; await expect(provider.rank(preferences, candidates)).rejects.toMatchObject({ requests_attempted: 0 });
  now -= 86400_000; await expect(provider.rank(preferences, candidates)).rejects.toMatchObject({ requests_attempted: 0 });
  now += 2 * 86400_000; await expect(provider.rank(preferences, candidates)).rejects.toMatchObject({ requests_attempted: 1 }); expect(transport).toHaveBeenCalledTimes(3);
  for (const cap of [{ dailyTokenLimit: 1 }, { dailyBudgetMicroUsd: 1 }]) {
    const limited = fetcher(); await expect(new GroqRecommendations({ ...options, ...cap, fetcher: limited }).rank(preferences, candidates)).rejects.toMatchObject({ reason: "quota", requests_attempted: 0 }); expect(limited).not.toHaveBeenCalled();
  }
});
test("deadline, caller abort, byte bounds and network failure stay redacted without retry", async () => {
  vi.useFakeTimers(); const hanging = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
  const timeout = new GroqRecommendations({ ...options, timeoutMs: 20, fetcher: hanging }).rank(preferences, candidates);
  const rejected = expect(timeout).rejects.toMatchObject({ reason: "timeout", requests_attempted: 1 }); await vi.advanceTimersByTimeAsync(21); await rejected; expect(hanging).toHaveBeenCalledTimes(1);
  const controller = new AbortController(); controller.abort(); await expect(new GroqRecommendations({ ...options, fetcher: hanging }).rank(preferences, candidates, controller.signal)).rejects.toBeDefined(); expect(hanging).toHaveBeenCalledTimes(1);
  const abort = new AbortController(), pending = new GroqRecommendations({ ...options, fetcher: hanging }).rank(preferences, candidates, abort.signal); abort.abort(); await expect(pending).rejects.toBeDefined();
  const oversized = vi.fn<typeof fetch>().mockResolvedValue(new Response("x".repeat(250001)));
  await expect(new GroqRecommendations({ ...options, fetcher: oversized }).rank(preferences, candidates)).rejects.toMatchObject({ reason: "invalid_response" });
  const failure = vi.fn<typeof fetch>().mockRejectedValue(new Error("fixture-server-secret raw private prompt"));
  const failed = new GroqRecommendations({ ...options, fetcher: failure }).rank(preferences, candidates); await expect(failed).rejects.toThrow("Recommendation provider unavailable"); expect(failure).toHaveBeenCalledTimes(1);
});
test("server env defaults OFF and enabling requires explicit reviewed model, cost/data approval, positive budgets and pricing", () => {
  expect(parseServerEnv({}).GROQ_ENABLED).toBe(false);
  const enabled = { GROQ_ENABLED: "true", GROQ_API_KEY: "fixture-server-secret", GROQ_MODEL: options.model, GROQ_COST_CONTROLS_APPROVED: "true", GROQ_ZDR_CONFIRMED: "true", GROQ_DAILY_REQUEST_LIMIT: 5, GROQ_DAILY_TOKEN_LIMIT: 100000, GROQ_DAILY_BUDGET_MICRO_USD: 100000, GROQ_INPUT_USD_PER_MILLION: 1, GROQ_OUTPUT_USD_PER_MILLION: 2 };
  expect(parseServerEnv(enabled).GROQ_ENABLED).toBe(true);
  for (const key of Object.keys(enabled).filter(key => key !== "GROQ_ENABLED")) { const missing = { ...enabled } as Record<string, unknown>; delete missing[key]; expect(() => parseServerEnv(missing), key).toThrow("Invalid server configuration"); }
  expect(() => parseServerEnv({ ...enabled, GROQ_MODEL: "retired-model" })).toThrow("Invalid server configuration");
  expect(() => new GroqRecommendations({ ...options, costControlsApproved: false } as unknown as GroqOptions)).toThrow("Invalid bounded recommendation configuration");
});
