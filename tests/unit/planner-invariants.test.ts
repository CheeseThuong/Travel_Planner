import { expect, test } from "vitest";
import { generatePlan } from "@/domain/planning/engine";
import { routingInputForDraft } from "@/domain/routing/matrix";
import { fixedClock, plannerDraft, plannerStop } from "../fixtures/planner";
import type { MatrixResult } from "@/domain/ports/providers";
import { BoundedRoutingProvider } from "@/adapters/routing/bounded";

const minute = (time: string) => { const [hour, value] = time.split(":").map(Number); return hour * 60 + value; };
const intersectsLunch = (start: number, end: number) => start < 780 && end > 720;

const cases = [
  ...Array.from({ length: 25 }, (_, index) => ({ seed: index + 1, days: null, count: null })),
  ...[0, 1, 2, 10, 30].flatMap(count => Array.from({ length: 7 }, (_, day) => ({ seed: 100 + count * 7 + day, days: day + 1, count }))),
];
test.each(cases)("independent accounting/time/travel/break/budget invariants, seed $seed, days $days, stops $count", (fixture) => {
  const { seed } = fixture;
  let state = seed;
  const random = (limit: number) => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % limit; };
  const dayCount = fixture.days ?? 1 + random(3), count = fixture.count ?? 5 + random(11);
  const input = plannerDraft({ end_date: `2026-11-${String(5 + dayCount).padStart(2, "0")}`, pace: "active", stops: Array.from({ length: count }, (_, index) => plannerStop(`stop-${index}`, { requested_duration_min: 15 + random(106), is_required: index % 3 === 0, location: { lat: 12.2 + random(30) / 1000, lng: 109.18 + random(30) / 1000 }, cost_estimate: index % 2 ? { provenance: "unknown" } : { provenance: "user_entered", amount_vnd: random(100000), applies_to: "per_person" } })) });
  const nodes = routingInputForDraft(input).nodes;
  const matrix: MatrixResult = { node_ids: nodes.map((node) => node.id), cells: nodes.map((_, from) => nodes.map((__, to) => from !== to && random(12) === 0 ? { status: "unreachable" } : { status: "reachable", duration_minutes: from === to ? 0 : random(46), estimate_source: "approximate", uncertainty: "high" })), warnings: ["SYNTHETIC_FIXTURE"], elements_requested: 0 };
  const before = structuredClone({ input, matrix });
  const result = generatePlan(input, matrix, { clock: fixedClock, seed, plan_run_id: `synthetic-${seed}` });
  expect(result.status).toBe("candidate");
  if (result.status !== "candidate") throw new Error("Unexpected lock-free fixture conflict");
  expect(result.candidate.days.map(day => day.date)).toEqual(Array.from({ length: dayCount }, (_, day) => `2026-11-${String(6 + day).padStart(2, "0")}`));
  const scheduledIds: string[] = [];
  for (const day of result.candidate.days) {
    expect(day.stops.length).toBeLessThanOrEqual(4);
    const lower = day.date === input.start_date ? 630 : 480, upper = day.date === input.end_date ? 960 : 1260;
    let previousId = "base", previousEnd = lower;
    for (const [index, visit] of day.stops.entries()) {
      const stop = input.stops.find((point) => point.id === visit.stop_id)!;
      const start = minute(visit.start_local), end = minute(visit.end_local), departure = minute(visit.travel_departure_local), arrival = minute(visit.arrival_local);
      const cell = matrix.cells[matrix.node_ids.indexOf(previousId)][matrix.node_ids.indexOf(stop.id)];
      expect(cell.status).toBe("reachable");
      if (cell.status !== "reachable") throw new Error("Unreachable edge scheduled");
      expect(visit.travel_from_previous_minutes).toBe(cell.duration_minutes);
      expect(visit.estimate_source).toBe("approximate");
      expect(arrival - departure).toBe(cell.duration_minutes);
      expect(departure).toBeGreaterThanOrEqual(previousEnd + (index ? input.preferences.rest_buffer_minutes : 0));
      expect(start).toBeGreaterThanOrEqual(arrival); expect(start).toBeGreaterThanOrEqual(lower); expect(end).toBeLessThanOrEqual(upper);
      expect(end - start).toBe(stop.requested_duration_min);
      expect(intersectsLunch(start, end)).toBe(false);
      if (arrival > departure) expect(intersectsLunch(departure, arrival)).toBe(false);
      expect(visit.warnings).toContain("HOURS_UNVERIFIED");
      scheduledIds.push(stop.id); previousId = stop.id; previousEnd = end;
    }
    if (day.stops.length) {
      expect(day.return_leg).toBeDefined();
      const leg = day.return_leg!, cell = matrix.cells[matrix.node_ids.indexOf(previousId)][0];
      expect(cell.status).toBe("reachable");
      if (cell.status === "reachable") expect(leg.duration_minutes).toBe(cell.duration_minutes);
      expect(minute(leg.departure_local)).toBeGreaterThanOrEqual(previousEnd);
      expect(minute(leg.arrival_local)).toBeLessThanOrEqual(upper);
    }
  }
  const all = [...scheduledIds, ...result.unscheduled.map((entry) => entry.stop_id)];
  expect(all.sort()).toEqual(input.stops.map((stop) => stop.id).sort()); expect(new Set(all).size).toBe(count);
  expect(result.unscheduled.every((entry) => !!entry.reason && !!entry.message)).toBe(true);
  expect(result.candidate.unfulfilled_required).toEqual(input.stops.filter((stop) => stop.is_required && !scheduledIds.includes(stop.id)).map((stop) => stop.id).sort());
  expect(result.candidate.budget.unknown_cost_count).toBe(input.stops.filter((stop) => scheduledIds.includes(stop.id) && stop.cost_estimate.provenance === "unknown").length);
  const knownSpend = input.stops.filter(stop => scheduledIds.includes(stop.id)).reduce((total, stop) => total + (stop.cost_estimate.provenance === "unknown" ? 0 : stop.cost_estimate.amount_vnd * input.party_size), 0);
  expect(result.candidate.budget.known_estimated_spend_vnd).toBe(knownSpend);
  expect(result.candidate.score.scheduled_required).toBe(input.stops.filter(stop => stop.is_required && scheduledIds.includes(stop.id)).length);
  expect(result.candidate.score.scheduled_optional).toBe(scheduledIds.length - result.candidate.score.scheduled_required);
  expect(result.candidate.diagnostics.matrix_elements_reserved).toBe((count + 1) ** 2);
  expect(result.candidate.diagnostics.feasibility).toBe("tentative");
  expect(JSON.stringify(generatePlan(input, matrix, { clock: fixedClock, seed, plan_run_id: `synthetic-${seed}` }))).toBe(JSON.stringify(result));
  expect({ input, matrix }).toEqual(before);
});

test.each(["missing", "quota", "timeout"])("provider %s keeps all selections in a deterministic, explicitly approximate plan", async (failure) => {
  const input = plannerDraft({ stops: [plannerStop("required", { is_required: true }), plannerStop("manual-transfer", { is_required: true, transport_constraint: "manual_transfer" })] });
  const before = structuredClone(input);
  let calls = 0;
  const primary = failure === "missing" ? undefined : { estimateMatrix: async (): Promise<MatrixResult> => {
    calls++;
    if (failure === "quota") throw new Error("429 synthetic quota");
    return new Promise(() => {});
  } };
  const matrix = await new BoundedRoutingProvider(primary, 5).estimateMatrix(routingInputForDraft(input));
  const context = { clock: fixedClock, seed: 42, plan_run_id: "synthetic-fallback" };
  const result = generatePlan(input, matrix, context);
  expect(result.status).toBe("candidate");
  if (result.status !== "candidate") throw new Error("Unexpected lock-free conflict");
  expect([...result.candidate.days.flatMap(day => day.stops.map(stop => stop.stop_id)), ...result.unscheduled.map(stop => stop.stop_id)].sort()).toEqual(["manual-transfer", "required"]);
  expect(result.candidate.unfulfilled_required).toEqual(["manual-transfer"]);
  expect(result.candidate.warnings).toContain("APPROXIMATE_NOT_ROAD_ETA");
  expect(result.candidate.diagnostics.matrix_elements_requested).toBe(failure === "missing" ? 0 : null);
  expect(result.candidate.diagnostics.matrix_elements_reserved).toBe(9);
  expect(generatePlan(input, matrix, context)).toEqual(result);
  expect(calls).toBe(failure === "missing" ? 0 : 1);
  expect(input).toEqual(before);
});

test("an absent prepared matrix fails explicitly and leaves selected inputs intact", () => {
  const input = plannerDraft({ stops: [plannerStop("required", { is_required: true })] });
  const before = structuredClone(input);
  expect(() => generatePlan(input, { node_ids: [], cells: [], warnings: [], elements_requested: 0 }, { clock: fixedClock, seed: 42, plan_run_id: "synthetic-no-matrix" })).toThrow();
  expect(input).toEqual(before);
});
