import type { EstimateSource, ScheduledStop, TripDraft, TripStop, UnscheduledReason } from "../model/trip";
import type { Clock, MatrixResult, RouteCell } from "../ports/providers";
import { localTime, minutes, openingWindows, overlaps, type DayWindow, type TimeWindow } from "./calendar";

export const paceCapacity = { relaxed: 2, balanced: 3, active: 4 } as const;
export interface PlannerVisit extends ScheduledStop { readonly travel_departure_local: string; readonly arrival_local: string; readonly rest_before_minutes: number }
export interface ReturnLeg { readonly departure_local: string; readonly arrival_local: string; readonly duration_minutes: number; readonly estimate_source: EstimateSource }
export interface DayEvaluation { readonly valid: boolean; readonly failure: UnscheduledReason; readonly stops: readonly PlannerVisit[]; readonly return_leg?: ReturnLeg; readonly travel_minutes: number; readonly wait_minutes: number }

export function cellBetween(matrix: MatrixResult, from: string, to: string): RouteCell {
  if (from === to) return { status: "reachable", duration_minutes: 0, estimate_source: "approximate", uncertainty: "high" };
  const first = matrix.node_ids.indexOf(from), second = matrix.node_ids.indexOf(to);
  return first >= 0 && second >= 0 ? matrix.cells[first][second] : { status: "unreachable" };
}
export function afterBreaks(earliest: number, duration: number, breaks: readonly TimeWindow[]): number {
  let start = earliest;
  for (const pause of breaks) if (overlaps({ start, end: start + duration }, pause)) start = pause.end;
  return start;
}

/** A day is accepted only after evaluating every directed edge, window and return leg. */
export function evaluateDay(order: readonly TripStop[], day: DayWindow, draft: TripDraft, matrix: MatrixResult, clock: Clock, strictLocks: boolean): DayEvaluation {
  const stops: PlannerVisit[] = [];
  let previous = "base", previousEnd = day.start, travel = 0, wait = 0;
  const fail = (failure: UnscheduledReason): DayEvaluation => ({ valid: false, failure, stops, travel_minutes: travel, wait_minutes: wait });
  if (order.length > paceCapacity[draft.pace]) return fail("CAPACITY");
  for (const [index, stop] of order.entries()) {
    if (stop.transport_constraint === "manual_transfer") return fail(stop.lock ? "LOCK_CONFLICT" : "UNREACHABLE");
    if (stop.lock && (stop.lock.plan_date !== day.date || (strictLocks ? stop.lock.sort_index !== index : index > stop.lock.sort_index))) return fail("LOCK_CONFLICT");
    const cell = cellBetween(matrix, previous, stop.id);
    if (cell.status === "unreachable") return fail(stop.lock ? "LOCK_CONFLICT" : "UNREACHABLE");
    const rest = index === 0 ? 0 : draft.preferences.rest_buffer_minutes;
    const departure = afterBreaks(previousEnd + rest, cell.duration_minutes, day.breaks);
    const arrival = departure + cell.duration_minutes;
    const hours = openingWindows(stop.hours, day.date, clock);
    if (!hours.windows.length) return fail(stop.lock ? "LOCK_CONFLICT" : "CLOSED");
    let start: number | undefined;
    if (stop.lock) {
      const lockedStart = minutes(stop.lock.start_local), end = lockedStart + stop.requested_duration_min;
      if (lockedStart >= arrival && lockedStart >= day.start && end <= day.end && !day.breaks.some((pause) => overlaps({ start: lockedStart, end }, pause)) && hours.windows.some((window) => lockedStart >= window.start && end <= window.end)) start = lockedStart;
    } else {
      for (const window of hours.windows) {
        const candidate = afterBreaks(Math.max(arrival, window.start, day.start), stop.requested_duration_min, day.breaks);
        if (candidate + stop.requested_duration_min <= Math.min(window.end, day.end)) { start = candidate; break; }
      }
    }
    if (start === undefined) return fail(stop.lock ? "LOCK_CONFLICT" : "TIME_WINDOW");
    const end = start + stop.requested_duration_min;
    const warnings = [...hours.warnings, ...(cell.estimate_source === "approximate" ? ["TRAVEL_APPROXIMATE"] : []), ...(stop.transport_constraint === "access_unverified" ? ["ACCESS_UNVERIFIED"] : [])];
    stops.push({ stop_id: stop.id, start_local: localTime(start), end_local: localTime(end), travel_departure_local: localTime(departure), arrival_local: localTime(arrival), rest_before_minutes: rest, travel_from_previous_minutes: cell.duration_minutes, estimate_source: cell.estimate_source, warnings });
    travel += cell.duration_minutes; wait += departure - previousEnd - rest + start - arrival;
    previous = stop.id; previousEnd = end;
  }
  if (!draft.preferences.return_to_base || order.length === 0) return { valid: true, failure: "UNKNOWN", stops, travel_minutes: travel, wait_minutes: wait };
  const back = cellBetween(matrix, previous, "base");
  if (back.status === "unreachable") return fail("UNREACHABLE");
  const departure = afterBreaks(previousEnd, back.duration_minutes, day.breaks), arrival = departure + back.duration_minutes;
  if (arrival > day.end) return fail("TIME_WINDOW");
  return { valid: true, failure: "UNKNOWN", stops, return_leg: { departure_local: localTime(departure), arrival_local: localTime(arrival), duration_minutes: back.duration_minutes, estimate_source: back.estimate_source }, travel_minutes: travel + back.duration_minutes, wait_minutes: wait + departure - previousEnd };
}
