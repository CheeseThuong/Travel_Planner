import { expect, test } from "vitest";
import { geographicClusters, improveDay } from "@/domain/planning/improvement";
import { buildTripCalendar } from "@/domain/planning/calendar";
import { evaluateDay } from "@/domain/planning/feasibility";
import { fixedClock, plannerDraft, plannerStop } from "../fixtures/planner";
import type { MatrixResult } from "@/domain/ports/providers";

test("geographic clusters keep nearby points together with deterministic ties", () => {
  const input = plannerDraft({ stops: [plannerStop("a"), plannerStop("b", { location: { lat: 12.251, lng: 109.19 } }), plannerStop("c", { location: { lat: 12.6, lng: 109.4 } }), plannerStop("d", { location: { lat: 12.601, lng: 109.4 } })] });
  const clusters = geographicClusters(input, 2);
  expect(clusters.get("a")).toBe(clusters.get("b")); expect(clusters.get("c")).toBe(clusters.get("d")); expect(clusters.get("a")).not.toBe(clusters.get("c"));
  expect([...geographicClusters({ ...input, stops: [...input.stops].reverse() }, 2)]).toEqual([...clusters]);
});
test("directed2-opt improves only feasible unlocked routes without modifying selections", () => {
  const input = plannerDraft({ end_date: "2026-11-06", arrival_local_time: "08:00", departure_local_time: "21:00", pace: "active", preferences: { day_start: "08:00", day_end: "21:00", lunch_buffer_minutes: 0, rest_buffer_minutes: 0, return_to_base: true }, stops: ["a", "b", "c", "d"].map((id) => plannerStop(id, { requested_duration_min: 15 })) });
  const ids = ["base", "a", "b", "c", "d"];
  const matrix: MatrixResult = { node_ids: ids, cells: ids.map((from) => ids.map((to) => ({ status: "reachable", duration_minutes: from === to ? 0 : ({ "a:b": 100, "c:d": 100, "a:c": 5, "c:b": 5, "b:d": 5 }[`${from}:${to}`] ?? 10), estimate_source: "approximate", uncertainty: "high" }))), warnings: [], elements_requested: 0 };
  const day = buildTripCalendar(input)[0], before = structuredClone(input);
  const improved = improveDay(input.stops, day, input, matrix, fixedClock);
  expect(evaluateDay(improved, day, input, matrix, fixedClock, true).travel_minutes).toBeLessThan(evaluateDay(input.stops, day, input, matrix, fixedClock, true).travel_minutes);
  expect(new Set(improved.map((stop) => stop.id))).toEqual(new Set(ids.slice(1))); expect(input).toEqual(before);
});
