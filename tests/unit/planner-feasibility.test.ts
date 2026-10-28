import { expect, test } from "vitest";
import { buildTripCalendar } from "@/domain/planning/calendar";
import { evaluateDay } from "@/domain/planning/feasibility";
import { fixedClock, plannerDraft, plannerStop } from "../fixtures/planner";
import type { MatrixResult } from "@/domain/ports/providers";

const matrix: MatrixResult = { node_ids: ["base", "a", "b"], cells: [[0, 0, 0], [0, 0, 12], [0, 40, 0]].map((row) => row.map((duration_minutes) => ({ status: "reachable", duration_minutes, estimate_source: "approximate", uncertainty: "high" }))), warnings: [], elements_requested: 0 };
test("feasibility uses the actual directed edge and preserves exact lock times/positions", () => {
  const input = plannerDraft({ end_date: "2026-11-06", arrival_local_time: "08:00", departure_local_time: "18:00", preferences: { day_start: "08:00", day_end: "21:00", lunch_buffer_minutes: 0, rest_buffer_minutes: 0, return_to_base: true }, stops: [plannerStop("a", { lock: { plan_date: "2026-11-06", start_local: "10:00", sort_index: 0 } }), plannerStop("b", { lock: { plan_date: "2026-11-06", start_local: "11:20", sort_index: 1 } })] });
  const result = evaluateDay(input.stops, buildTripCalendar(input)[0], input, matrix, fixedClock, true);
  expect(result.valid).toBe(true);
  expect(result.stops[1]).toMatchObject({ start_local: "11:20", travel_from_previous_minutes: 12, arrival_local: "11:12" });
  expect(result.return_leg?.duration_minutes).toBe(0);
  expect(result.stops[0].warnings).toContain("HOURS_UNVERIFIED");
});
test("a visit never crosses split opening windows or lunch and return travel must fit", () => {
  const stop = plannerStop("a", { requested_duration_min: 90, hours: { state: "verified_editorial", checked_at: "2026-10-20", source: "Synthetic", intervals: [{ weekday: 5, start_local: "09:00", end_local: "12:00" }, { weekday: 5, start_local: "14:00", end_local: "17:00" }] } });
  const input = plannerDraft({ arrival_local_time: "11:00", stops: [stop] });
  const result = evaluateDay([stop], buildTripCalendar(input)[0], input, matrix, fixedClock, true);
  expect(result.valid).toBe(true);
  expect(result.stops[0]).toMatchObject({ start_local: "14:00", end_local: "15:30" });
  const distant = { ...matrix, cells: matrix.cells.map((row, index) => row.map((cell, to) => index === 1 && to === 0 ? { ...cell, status: "reachable" as const, duration_minutes: 900 } : cell)) };
  expect(evaluateDay([stop], buildTripCalendar(input)[0], input, distant, fixedClock, true).valid).toBe(false);
});
