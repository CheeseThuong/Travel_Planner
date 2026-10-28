import { expect, test } from "vitest";
import { generatePlan, routingInputForDraft } from "@/domain/planning/engine";
import { ApproximateRoutingProvider } from "@/adapters/routing/approximate";
import { fixedClock, plannerDraft, plannerStop } from "../fixtures/planner";
import type { TripDraft } from "@/domain/model/trip";
import type { MatrixResult } from "@/domain/ports/providers";

const context = { clock: fixedClock, seed: 42, plan_run_id: "synthetic-run" };
async function plan(draft: TripDraft, matrix?: MatrixResult) { return generatePlan(draft, matrix ?? await new ApproximateRoutingProvider().estimateMatrix(routingInputForDraft(draft)), context); }
function ids(result: Awaited<ReturnType<typeof plan>>) { return [...(result.status === "candidate" ? result.candidate.days.flatMap((day) => day.stops.map((stop) => stop.stop_id)) : []), ...result.unscheduled.map((stop) => stop.stop_id)].sort(); }

test("partial day cannot fit four visits; every selected and required ID remains accounted for", async () => {
  const draft = plannerDraft({ end_date: "2026-11-06", arrival_local_time: "17:00", departure_local_time: "19:00", stops: ["a", "b", "c", "d"].map((id) => plannerStop(id, { is_required: true })) });
  const before = structuredClone(draft), result = await plan(draft);
  expect(result.status).toBe("candidate");
  if (result.status === "candidate") { expect(result.candidate.days[0].stops.length).toBeLessThan(4); expect(result.candidate.unfulfilled_required.length).toBeGreaterThan(0); expect(result.candidate.warnings).toContain("ARRIVAL_STARTS_AT_BASE"); }
  expect(ids(result)).toEqual(["a", "b", "c", "d"]); expect(draft).toEqual(before);
});
test("closed, oversized, manual-transfer and distant points have explicit reasons", async () => {
  const draft = plannerDraft({ end_date: "2026-11-06", arrival_local_time: "17:00", departure_local_time: "19:00", stops: [plannerStop("closed", { hours: { state: "verified_editorial", checked_at: "2026-10-20", source: "Synthetic", intervals: [{ weekday: 2, start_local: "09:00", end_local: "17:00" }] } }), plannerStop("long", { requested_duration_min: 240 }), plannerStop("boat", { transport_constraint: "manual_transfer" }), plannerStop("distant", { location: { lat: 14, lng: 109 } })] });
  const result = await plan(draft);
  expect(result.unscheduled).toEqual(expect.arrayContaining([expect.objectContaining({ stop_id: "closed", reason: "CLOSED" }), expect.objectContaining({ stop_id: "long", reason: "TIME_WINDOW" }), expect.objectContaining({ stop_id: "boat", reason: "UNREACHABLE", message: "MANUAL_TRANSFER_REQUIRED" }), expect.objectContaining({ stop_id: "distant", reason: "TRAVEL_TOO_LONG" })]));
  expect(ids(result)).toEqual(["boat", "closed", "distant", "long"]);
});
test("required-first and soft budget guidance choose affordable optional before expensive without dropping required", async () => {
  const cost = (amount_vnd: number) => ({ provenance: "user_entered" as const, amount_vnd, applies_to: "group" as const });
  const draft = plannerDraft({ end_date: "2026-11-06", pace: "relaxed", budget: { currency: "VND", total_vnd: 100, known_costs_vnd: { lodging: 0, transport: 0, meals: 0, other: 0 } }, stops: [plannerStop("required", { is_required: true, cost_estimate: cost(200) }), plannerStop("expensive", { cost_estimate: cost(100) }), plannerStop("cheap", { cost_estimate: cost(10) })] });
  const result = await plan(draft);
  expect(result.status).toBe("candidate");
  if (result.status === "candidate") { expect(result.candidate.days[0].stops.map((stop) => stop.stop_id).sort()).toEqual(["cheap", "required"]); expect(result.candidate.budget.status).toBe("over_budget"); }
  expect(result.unscheduled).toContainEqual(expect.objectContaining({ stop_id: "expensive", reason: "CAPACITY" }));
});
test("unreachable cells are not silently repaired; feasible alternative ordering is used", async () => {
  const draft = plannerDraft({ end_date: "2026-11-06", stops: [plannerStop("a"), plannerStop("b")] });
  const matrix = await new ApproximateRoutingProvider().estimateMatrix(routingInputForDraft(draft));
  const directed: MatrixResult = { ...matrix, cells: matrix.cells.map((row, from) => row.map((cell, to) => from === 1 && to === 2 ? { status: "unreachable" as const } : cell)) };
  const result = await plan(draft, directed);
  expect(result.status).toBe("candidate");
  if (result.status === "candidate") expect(result.candidate.days[0].stops.map((stop) => stop.stop_id)).toEqual(["b", "a"]);
  const unreachable: MatrixResult = { ...matrix, cells: matrix.cells.map((row, from) => row.map((cell, to) => from === 0 && to !== 0 ? { status: "unreachable" as const } : cell)) };
  expect((await plan(draft, unreachable)).unscheduled.every((stop) => stop.reason === "UNREACHABLE")).toBe(true);
});
test("conflicting locks block the candidate, account for every point and never rewrite input", async () => {
  const draft = plannerDraft({ stops: [plannerStop("locked", { lock: { plan_date: "2026-11-06", start_local: "08:00", sort_index: 0 } }), plannerStop("other")] });
  const before = structuredClone(draft), result = await plan(draft);
  expect(result.status).toBe("conflict"); expect(ids(result)).toEqual(["locked", "other"]); expect(draft).toEqual(before);
});
test("locks retain absolute position after insertion and no-key/unknown inputs stay tentative", async () => {
  const draft = plannerDraft({ end_date: "2026-11-06", departure_local_time: "19:00", stops: [plannerStop("locked", { lock: { plan_date: "2026-11-06", start_local: "16:00", sort_index: 1 } }), plannerStop("before", { is_required: true })] });
  const result = await plan(draft);
  expect(result.status).toBe("candidate");
  if (result.status === "candidate") { expect(result.candidate.days[0].stops[1]).toMatchObject({ stop_id: "locked", start_local: "16:00" }); expect(result.candidate.diagnostics.feasibility).toBe("tentative"); expect(result.candidate.budget.unknown_cost_count).toBe(2); }
});
test("same fixture is byte-identical, including equal coordinates;30-stop/7-day accounting holds", async () => {
  const draft = plannerDraft({ end_date: "2026-11-12", pace: "active", stops: Array.from({ length: 30 }, (_, index) => plannerStop(`stop-${String(index).padStart(2, "0")}`)) });
  const first = await plan(draft), second = await plan(draft);
  expect(JSON.stringify(second)).toBe(JSON.stringify(first)); expect(ids(first)).toEqual(draft.stops.map((stop) => stop.id).sort());
  if (first.status === "candidate") expect(first.candidate.days.every((day) => day.stops.length <= 4)).toBe(true);
  await expect(plan({ ...draft, planning_mode: "manual" })).rejects.toThrow("MANUAL_MODE_REQUIRES_VALIDATION");
  await expect(plan({ ...draft, stops: [draft.stops[0], draft.stops[0]] })).rejects.toThrow();
});

test("a required point made reachable by an optional connector displaces another optional point", async () => {
  const cost = (amount_vnd: number) => ({ provenance: "user_entered" as const, amount_vnd, applies_to: "group" as const });
  const draft = plannerDraft({ end_date: "2026-11-06", pace: "relaxed", stops: [plannerStop("required", { is_required: true }), plannerStop("connector", { cost_estimate: cost(10) }), plannerStop("cheap", { cost_estimate: cost(1) })] });
  const source = await new ApproximateRoutingProvider().estimateMatrix(routingInputForDraft(draft));
  const matrix: MatrixResult = { ...source, cells: source.cells.map((row, from) => row.map((cell, to) => (from === 0 || from === 3) && to === 1 ? { status: "unreachable" as const } : cell)) };
  const result = await plan(draft, matrix);
  expect(result.status).toBe("candidate");
  if (result.status === "candidate") expect(result.candidate.days[0].stops.map((stop) => stop.stop_id).sort()).toEqual(["connector", "required"]);
});
