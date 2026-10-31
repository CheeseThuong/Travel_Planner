import type { TripDraft } from "../model/trip";
import type { Clock, MatrixResult } from "../ports/providers";
import type { PlanningResult } from "./engine";
import { buildTripCalendar } from "./calendar";
import { evaluateDay } from "./feasibility";

/** Verify the boundary after orchestration; never trust rank/provider output as a schedule. */
export function verifyPlanningResult(draft: TripDraft, result: PlanningResult, matrix: MatrixResult, clock: Clock): void {
  const fail = () => { throw new Error("Candidate verification failed"); };
  const selected = new Map(draft.stops.map(stop => [stop.id, stop]));
  const scheduled = result.status === "candidate" ? result.candidate.days.flatMap(day => day.stops.map(stop => stop.stop_id)) : [];
  const unscheduled = result.unscheduled.map(stop => stop.stop_id), accounted = [...scheduled, ...unscheduled];
  if (new Set(accounted).size !== accounted.length || accounted.length !== selected.size || accounted.some(id => !selected.has(id))) fail();
  if (result.status === "conflict") {
    if (!result.conflicts.length || result.conflicts.some(conflict => !selected.get(conflict.stop_id)?.lock)) fail();
    return;
  }
  const calendar = buildTripCalendar(draft), candidate = result.candidate;
  if (candidate.input_version !== draft.version || candidate.days.length !== calendar.length || JSON.stringify(candidate.unscheduled) !== JSON.stringify(result.unscheduled)) fail();
  const missingRequired = draft.stops.filter(stop => stop.is_required && !scheduled.includes(stop.id)).map(stop => stop.id).sort();
  if (JSON.stringify([...candidate.unfulfilled_required].sort()) !== JSON.stringify(missingRequired) || unscheduled.some(id => selected.get(id)?.lock)) fail();
  for (const [index, day] of candidate.days.entries()) {
    if (day.date !== calendar[index].date) fail();
    const stops = day.stops.map(stop => selected.get(stop.stop_id)!);
    const evaluated = evaluateDay(stops, calendar[index], draft, matrix, clock, true);
    if (!evaluated.valid || evaluated.stops.length !== day.stops.length) fail();
    for (const [position, visit] of day.stops.entries()) {
      const expected = evaluated.stops[position];
      for (const field of ["stop_id", "start_local", "end_local", "travel_departure_local", "arrival_local", "rest_before_minutes", "travel_from_previous_minutes", "estimate_source"] as const) if (visit[field] !== expected[field]) fail();
    }
    if (JSON.stringify(evaluated.return_leg) !== JSON.stringify(day.return_leg)) fail();
  }
}
