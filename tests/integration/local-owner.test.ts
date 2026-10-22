import { randomUUID } from "node:crypto";
import { describe, expect, test } from "vitest";
import { createVerifiedOwnerDraftRepository, OwnerAccessError } from "@/adapters/supabase/owner-drafts.server";
import type { TripDraft } from "@/domain/model/trip";

const url = process.env.LOCAL_SUPABASE_URL;
const key = process.env.LOCAL_SUPABASE_PUBLISHABLE_KEY;
const marker = process.env.LOCAL_AUTH_TEST_MARKER;
if (!url || !key || !marker) throw new Error("Local Auth integration configuration missing");

async function anonymousToken(): Promise<string> {
  const response = await fetch(new URL("/auth/v1/signup", url), { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify({ data: { test_marker: marker } }) });
  const raw = await response.text();
  if (!response.ok || raw.length > 100_000) throw new Error("Anonymous local sign-in failed");
  const parsed = JSON.parse(raw) as { access_token?: unknown };
  if (typeof parsed.access_token !== "string") throw new Error("Anonymous local sign-in returned no token");
  return parsed.access_token;
}

function draft(id: string): TripDraft {
  return {
    id, version: 1, destination_slug: "nha-trang", title: "Auth integration trip",
    start_date: "2026-12-01", end_date: "2026-12-03", timezone: "Asia/Ho_Chi_Minh", arrival_local_time: "10:00", departure_local_time: "16:00",
    base_location: { label: "User-entered base", lat: 12.24, lng: 109.19, temporary: false },
    transport_mode: "walk", pace: "balanced", party_size: 4, planning_mode: "assisted",
    budget: { currency: "VND", total_vnd: 12_000_000, known_costs_vnd: { lodging: 2_000_000, transport: 1_000_000, meals: 0, other: 0 } },
    preferences: { day_start: "08:00", day_end: "21:00", lunch_buffer_minutes: 60, rest_buffer_minutes: 15, return_to_base: true },
    stops: [
      { id: randomUUID(), destination_slug: "nha-trang", user_title: "Manual one", location: { lat: 12.25, lng: 109.19 }, coordinate_provenance: "user_entered", requested_duration_min: 60, is_required: true, hours: { state: "hours_unknown" }, transport_constraint: "land", cost_estimate: { provenance: "user_entered", amount_vnd: 200_000, applies_to: "per_person" } },
      { id: randomUUID(), destination_slug: "nha-trang", user_title: "Manual two", location: { lat: 12.26, lng: 109.2 }, coordinate_provenance: "user_entered", requested_duration_min: 45, is_required: false, hours: { state: "hours_unknown" }, transport_constraint: "access_unverified", cost_estimate: { provenance: "unknown" } },
    ],
  };
}

describe("real local anonymous owner repository", () => {
  test("verifies Auth, preserves expanded draft, isolates owners and enforces versions", async () => {
    const [tokenA, tokenB] = await Promise.all([anonymousToken(), anonymousToken()]);
    const config = { url, publishableKey: key };
    const [ownerA, ownerB] = await Promise.all([createVerifiedOwnerDraftRepository(config, tokenA), createVerifiedOwnerDraftRepository(config, tokenB)]);
    await expect(createVerifiedOwnerDraftRepository(config, "forged-token")).rejects.toMatchObject<Partial<OwnerAccessError>>({ code: "unauthorized" });
    const input = draft(randomUUID());
    const created = await ownerA.create(input, randomUUID());
    expect(created).toMatchObject({ id: input.id, version: 1, party_size: 4, planning_mode: "assisted", budget: input.budget });
    expect(created.stops.map((stop) => stop.id)).toEqual(input.stops.map((stop) => stop.id));
    expect(created.stops.every((stop) => stop.destination_slug === "nha-trang")).toBe(true);
    expect(created.stops[0]?.cost_estimate).toEqual(input.stops[0]?.cost_estimate);
    await expect(ownerB.load(input.id)).resolves.toBeNull();
    await expect(ownerB.saveWithKey(input, 1, randomUUID())).resolves.toEqual({ status: "not_found" });
    const update: TripDraft = { ...created, planning_mode: "manual", budget: { ...created.budget, total_vnd: 10_000_000 } };
    const saved = await ownerA.saveWithKey(update, 1, randomUUID());
    expect(saved.status).toBe("saved");
    if (saved.status !== "saved") throw new Error("Expected saved result");
    expect(saved.draft).toMatchObject({ version: 2, planning_mode: "manual", budget: { total_vnd: 10_000_000 } });
    await expect(ownerA.saveWithKey(update, 1, randomUUID())).resolves.toEqual({ status: "version_conflict", current_version: 2 });
    await expect(ownerA.remove(input.id, 2)).resolves.toBe("removed");
    await expect(ownerA.load(input.id)).resolves.toBeNull();
  }, 30_000);
});
