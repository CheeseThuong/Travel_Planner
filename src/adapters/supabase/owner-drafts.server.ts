import type { PlanCandidate, TripDraft, TripStop } from "@/domain/model/trip";
import type { OwnerPlanningRepository, PlanWriteResult, SaveResult } from "@/domain/ports/persistence";

type OwnerClientConfig = Readonly<{ url: string; publishableKey: string }>;
type RpcResult = Readonly<{ status: string; id?: string; version?: number; current_version?: number }>;

export class OwnerAccessError extends Error {
  constructor(readonly code: "unauthorized" | "invalid_input" | "unavailable", readonly upstreamCode?: string) {
    super(code === "unauthorized" ? "Owner authentication required" : `Owner storage request failed${upstreamCode ? ` (${upstreamCode})` : ""}`);
    this.name = "OwnerAccessError";
  }
}

function endpoint(config: OwnerClientConfig, path: string): URL {
  const base = new URL(config.url);
  if (!/^https?:$/.test(base.protocol) || base.username || base.password || base.search || base.hash) throw new OwnerAccessError("unavailable");
  return new URL(path, `${base.origin}/`);
}

async function request(config: OwnerClientConfig, accessToken: string, path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response, body: string;
  try {
    response = await fetch(endpoint(config, path), {
      ...init,
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...init.headers },
      signal: AbortSignal.timeout(10_000),
    });
    body = await response.text();
  } catch { throw new OwnerAccessError("unavailable"); }
  if (body.length > 1_000_000) throw new OwnerAccessError("unavailable");
  if (!response.ok) {
    let upstreamCode: string | undefined;
    try {
      const parsed = JSON.parse(body) as { code?: unknown };
      if (typeof parsed.code === "string" && /^[A-Z0-9]{2,12}$/.test(parsed.code)) upstreamCode = parsed.code;
    } catch { /* Keep provider bodies redacted. */ }
    const category = response.status === 401 || response.status === 403 ? "unauthorized" : response.status === 400 ? "invalid_input" : "unavailable";
    throw new OwnerAccessError(category, upstreamCode);
  }
  if (!body) return null;
  try { return JSON.parse(body) as unknown; } catch { throw new OwnerAccessError("unavailable"); }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new OwnerAccessError("unavailable");
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?[0-9]+(?:\.[0-9]+)?$/.test(value)) return Number(value);
  throw new OwnerAccessError("unavailable");
}

function mapStop(raw: unknown, destinationSlug: TripStop["destination_slug"]): TripStop {
  const row = asRecord(raw);
  const cost = row.cost_provenance === "user_entered"
    ? { provenance: "user_entered" as const, amount_vnd: asNumber(row.estimated_cost_vnd), applies_to: row.cost_applies_to as "group" | "per_person" }
    : { provenance: "unknown" as const };
  const locked = row.is_locked === true;
  return {
    id: String(row.id),
    ...(row.catalog_place_id ? { catalog_place_id: String(row.catalog_place_id) } : {}),
    ...(row.provider_place_id ? { provider_place_id: String(row.provider_place_id) } : {}),
    destination_slug: destinationSlug,
    user_title: String(row.user_title),
    location: { lat: asNumber(row.user_lat), lng: asNumber(row.user_lng) },
    coordinate_provenance: row.coordinate_provenance as TripStop["coordinate_provenance"],
    requested_duration_min: asNumber(row.requested_duration_min),
    is_required: row.is_required === true,
    hours: row.hours_json as TripStop["hours"],
    ...(locked ? { lock: { plan_date: String(row.plan_date), start_local: String(row.planned_start_local).slice(0, 5), sort_index: asNumber(row.sort_index) } } : {}),
    transport_constraint: row.transport_constraint as TripStop["transport_constraint"],
    cost_estimate: cost,
  };
}

function mapDraft(raw: unknown): TripDraft {
  const row = asRecord(raw);
  const destination = asRecord(row.destinations);
  const destinationSlug = String(destination.slug) as TripDraft["destination_slug"];
  const costs = asRecord(row.budget_costs_json);
  const preferences = asRecord(row.preferences_json);
  const stops = Array.isArray(row.trip_stops) ? [...row.trip_stops].sort((a, b) => asNumber(asRecord(a).selection_index) - asNumber(asRecord(b).selection_index)) : [];
  return {
    id: String(row.id), version: asNumber(row.version), destination_slug: destinationSlug, title: String(row.title),
    start_date: String(row.start_date), end_date: String(row.end_date), timezone: String(row.timezone),
    arrival_local_time: String(row.arrival_local_time).slice(0, 5), departure_local_time: String(row.departure_local_time).slice(0, 5),
    base_location: { label: String(row.base_label), lat: asNumber(row.base_lat), lng: asNumber(row.base_lng), temporary: row.base_temporary === true },
    transport_mode: row.transport_mode as TripDraft["transport_mode"], pace: row.pace as TripDraft["pace"],
    party_size: asNumber(row.party_size), planning_mode: row.planning_mode as TripDraft["planning_mode"],
    budget: { currency: "VND", total_vnd: row.budget_total_vnd === null ? null : asNumber(row.budget_total_vnd), known_costs_vnd: {
      lodging: asNumber(costs.lodging), transport: asNumber(costs.transport), meals: asNumber(costs.meals), other: asNumber(costs.other),
    } },
    preferences: {
      day_start: String(preferences.day_start), day_end: String(preferences.day_end),
      lunch_buffer_minutes: asNumber(preferences.lunch_buffer_minutes), rest_buffer_minutes: asNumber(preferences.rest_buffer_minutes),
      return_to_base: preferences.return_to_base === true,
    },
    stops: stops.map((stop) => mapStop(stop, destinationSlug)),
  };
}

function draftPayload(draft: TripDraft): object {
  return draft;
}

export async function createVerifiedOwnerDraftRepository(config: OwnerClientConfig, accessToken: string): Promise<OwnerPlanningRepository> {
  if (!accessToken || accessToken.length > 8192) throw new OwnerAccessError("unauthorized");
  const verified = asRecord(await request(config, accessToken, "/auth/v1/user"));
  if (typeof verified.id !== "string") throw new OwnerAccessError("unauthorized");

  const load = async (id: string): Promise<TripDraft | null> => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new OwnerAccessError("invalid_input");
    const rows = await request(config, accessToken, `/rest/v1/trips?id=eq.${encodeURIComponent(id)}&select=*,destinations!inner(slug),trip_stops(*)&limit=1`);
    if (!Array.isArray(rows)) throw new OwnerAccessError("unavailable");
    return rows.length ? mapDraft(rows[0]) : null;
  };
  const saveWithKey = async (draft: TripDraft, expectedVersion: number, idempotencyKey: string, confirmLockedChanges = false): Promise<SaveResult> => {
    const value = asRecord(await request(config, accessToken, "/rest/v1/rpc/owner_save_trip", { method: "POST", body: JSON.stringify({ p_draft: draftPayload(draft), p_expected_version: expectedVersion, p_idempotency_key: idempotencyKey, p_confirm_locked_changes: confirmLockedChanges }) })) as unknown as RpcResult;
    if (value.status === "saved") {
      const stored = await load(String(value.id));
      if (!stored) throw new OwnerAccessError("unavailable");
      return { status: "saved", draft: stored };
    }
    if (value.status === "version_conflict") return { status: "version_conflict", current_version: Number(value.current_version) };
    if (["not_found", "idempotency_conflict", "id_conflict"].includes(value.status)) return { status: value.status as "not_found" | "idempotency_conflict" | "id_conflict" };
    throw new OwnerAccessError("unavailable");
  };
  const loadCandidate = async (tripId: string, runId: string): Promise<PlanCandidate | null> => {
    if (![tripId, runId].every((id) => /^[0-9a-f-]{36}$/i.test(id))) throw new OwnerAccessError("invalid_input");
    const rows = await request(config, accessToken, `/rest/v1/trip_plan_runs?trip_id=eq.${encodeURIComponent(tripId)}&id=eq.${encodeURIComponent(runId)}&select=candidate_json&limit=1`);
    if (!Array.isArray(rows)) throw new OwnerAccessError("unavailable");
    return rows.length ? asRecord(asRecord(rows[0]).candidate_json) as unknown as PlanCandidate : null;
  };
  const planFailure = (value: Record<string, unknown>): PlanWriteResult => {
    if (value.status === "version_conflict" || value.status === "plan_run_stale") return { status: value.status, current_version: asNumber(value.current_version) };
    if (value.status === "not_found" || value.status === "idempotency_conflict") return { status: value.status };
    throw new OwnerAccessError("unavailable");
  };
  return {
    load,
    loadCandidate,
    storeCandidate: async (tripId, expectedVersion, idempotencyKey, candidate) => {
      const value = asRecord(await request(config, accessToken, "/rest/v1/rpc/owner_store_plan", { method: "POST", body: JSON.stringify({ p_trip_id: tripId, p_expected_version: expectedVersion, p_idempotency_key: idempotencyKey, p_candidate: candidate }) }));
      if (value.status !== "candidate") return planFailure(value);
      const stored = await loadCandidate(tripId, String(value.plan_run_id));
      if (!stored) throw new OwnerAccessError("unavailable");
      return { status: "candidate", candidate: stored };
    },
    applyCandidate: async (tripId, runId, expectedVersion, idempotencyKey) => {
      const value = asRecord(await request(config, accessToken, "/rest/v1/rpc/owner_apply_plan", { method: "POST", body: JSON.stringify({ p_trip_id: tripId, p_plan_run_id: runId, p_expected_version: expectedVersion, p_idempotency_key: idempotencyKey, p_confirmed: true }) }));
      return value.status === "applied" ? { status: "applied", id: String(value.id), version: asNumber(value.version), state: "planned" } : planFailure(value);
    },
    create: async (draft, idempotencyKey) => {
      const result = await saveWithKey(draft, 0, idempotencyKey);
      if (result.status !== "saved") throw new OwnerAccessError(result.status === "id_conflict" || result.status === "idempotency_conflict" ? "invalid_input" : "unavailable");
      return result.draft;
    },
    saveWithKey,
    save: (draft, expectedVersion) => saveWithKey(draft, expectedVersion, crypto.randomUUID()),
    remove: async (id, expectedVersion) => {
      const value = asRecord(await request(config, accessToken, "/rest/v1/rpc/owner_delete_trip", { method: "POST", body: JSON.stringify({ p_trip_id: id, p_expected_version: expectedVersion }) }));
      if (value.status === "removed") return "removed";
      if (value.status === "version_conflict") return "version_conflict";
      return "version_conflict";
    },
  };
}
