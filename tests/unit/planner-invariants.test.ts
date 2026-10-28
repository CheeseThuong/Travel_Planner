import { expect, test } from "vitest";
import { generatePlan } from "@/domain/planning/engine";
import { routingInputForDraft } from "@/domain/routing/matrix";
import { fixedClock, plannerDraft, plannerStop } from "../fixtures/planner";
import type { MatrixResult } from "@/domain/ports/providers";

const minute = (time: string) => { const [hour, value] = time.split(":").map(Number); return hour * 60 + value; };
const intersectsLunch = (start: number, end: number) => start < 780 && end > 720;

test.each(Array.from({ length: 25 }, (_, index) => index + 1))("independent accounting/time/travel/break/budget invariants, fixture seed%s", (seed) => {
  let state = seed;
  const random = (limit: number) => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % limit; };
  const dayCount = 1 + random(3), count = 5 + random(11);
  const input = plannerDraft({ end_date: `2026-11-${String(5 + dayCount).padStart(2, "0")}`, pace: "active", stops: Array.from({ length: count }, (_, index) => plannerStop(`stop-${index}`, { requested_duration_min: 15 + random(106), is_required: index % 3 === 0, location: { lat: 12.2 + random(30) / 1000, lng: 109.18 + random(30) / 1000 }, cost_estimate: index % 2 ? { provenance: "unknown" } : { provenance: "user_entered", amount_vnd: random(100000), applies_to: "per_person" } })) });
  const nodes = routingInputForDraft(input).nodes;
  const matrix: MatrixResult = { node_ids: nodes.map((node) => node.id), cells: nodes.map((_, from) => nodes.map((__, to) => from !== to && random(12) === 0 ? { status: "unreachable" } : { status: "reachable", duration_minutes: from === to ? 0 : random(46), estimate_source: "approximate", uncertainty: "high" })), warnings: ["SYNTHETIC_FIXTURE"], elements_requested: 0 };
  const before = structuredClone({ input, matrix });
  const result = generatePlan(input, matrix, { clock: fixedClock, seed, plan_run_id: `synthetic-${seed}` });
  expect(result.status).toBe("candidate");
  if (result.status !== "candidate") throw new Error("Unexpected lock-free fixture conflict");
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
  expect(result.candidate.diagnostics.feasibility).toBe("tentative");
  expect(JSON.stringify(generatePlan(input, matrix, { clock: fixedClock, seed, plan_run_id: `synthetic-${seed}` }))).toBe(JSON.stringify(result));
  expect({ input, matrix }).toEqual(before);
});
