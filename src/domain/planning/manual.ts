import { summarizeTripBudget } from "../budget";
import type { TripDraft, TripStop } from "../model/trip";
import type { Clock, MatrixResult } from "../ports/providers";
import { assertMatrix, routingInputForDraft } from "../routing/matrix";
import { buildTripCalendar, minutes, openingWindows, overlaps } from "./calendar";
import { afterBreaks, cellBetween, paceCapacity } from "./feasibility";

export interface ManualAssignment { readonly stop_id: string; readonly plan_date: string; readonly start_local: string }
export interface ManualConflict { readonly stop_id: string; readonly code: "DUPLICATE_ASSIGNMENT" | "UNKNOWN_STOP" | "DAY_BOUNDS" | "OVERLAP" | "OPENING_HOURS" | "BREAK" | "TRAVEL" | "RETURN_TO_BASE" | "LOCK_CONFLICT" | "CAPACITY" | "MANUAL_TRANSFER_REQUIRED" | "ASSIGNMENT_TIME" }

/** Diagnose exactly the supplied sequence; this module never imports or calls the optimizer. */
export function validateManualPlan(draft: TripDraft, entries: readonly ManualAssignment[], matrix: MatrixResult, clock: Clock) {
  if (draft.planning_mode !== "manual") throw new RangeError("Manual validation requires manual mode");
  const calendar = buildTripCalendar(draft);
  assertMatrix(routingInputForDraft(draft), matrix);
  const conflicts: ManualConflict[] = [], warnings = new Set(matrix.warnings), assigned = new Set<string>();
  const add = (stop_id: string, code: ManualConflict["code"]) => conflicts.push({ stop_id, code });
  const previous = new Map<string, { stop: TripStop; start: number; end: number }>();
  const counts = new Map<string, number>();
  const now = clock.now().getTime(), fixed: Clock = { now: () => new Date(now) };
  if (!Number.isFinite(now)) throw new RangeError("Invalid deterministic manual clock");
  for (const entry of entries) {
    if (assigned.has(entry.stop_id)) add(entry.stop_id, "DUPLICATE_ASSIGNMENT");
    assigned.add(entry.stop_id);
    const stop = draft.stops.find((point) => point.id === entry.stop_id);
    if (!stop) { add(entry.stop_id, "UNKNOWN_STOP"); continue; }
    const day = calendar.find((item) => item.date === entry.plan_date);
    if (!day) { add(stop.id, "DAY_BOUNDS"); continue; }
    let start: number;
    try { start = minutes(entry.start_local); } catch { add(stop.id, "ASSIGNMENT_TIME"); continue; }
    const end = start + stop.requested_duration_min, index = counts.get(day.date) ?? 0;
    counts.set(day.date, index + 1);
    if (index >= paceCapacity[draft.pace]) add(stop.id, "CAPACITY");
    if (start < day.start || end > day.end) add(stop.id, "DAY_BOUNDS");
    if (day.breaks.some((pause) => overlaps({ start, end }, pause))) add(stop.id, "BREAK");
    const hours = openingWindows(stop.hours, day.date, fixed);
    hours.warnings.forEach((warning) => warnings.add(warning));
    if (!hours.windows.some((window) => start >= window.start && end <= window.end)) add(stop.id, "OPENING_HOURS");
    if (stop.lock && (stop.lock.plan_date !== entry.plan_date || stop.lock.start_local !== entry.start_local || stop.lock.sort_index !== index)) add(stop.id, "LOCK_CONFLICT");
    if (stop.transport_constraint === "manual_transfer") add(stop.id, "MANUAL_TRANSFER_REQUIRED");
    if (stop.transport_constraint === "access_unverified") warnings.add("ACCESS_UNVERIFIED");
    const before = previous.get(day.date), cell = cellBetween(matrix, before?.stop.id ?? "base", stop.id);
    if (before && start < before.end) add(stop.id, "OVERLAP");
    if (cell.status === "unreachable" || afterBreaks((before?.end ?? day.start) + (before ? draft.preferences.rest_buffer_minutes : 0), cell.status === "reachable" ? cell.duration_minutes : 0, day.breaks) + (cell.status === "reachable" ? cell.duration_minutes : 0) > start) add(stop.id, "TRAVEL");
    if (cell.status === "reachable" && cell.estimate_source === "approximate") warnings.add("TRAVEL_APPROXIMATE");
    previous.set(day.date, { stop, start, end });
  }
  if (draft.preferences.return_to_base) for (const [date, last] of previous) {
    const day = calendar.find((item) => item.date === date)!;
    const back = cellBetween(matrix, last.stop.id, "base");
    if (back.status === "reachable" && back.estimate_source === "approximate") warnings.add("TRAVEL_APPROXIMATE");
    if (back.status === "unreachable" || afterBreaks(last.end, back.status === "reachable" ? back.duration_minutes : 0, day.breaks) + (back.status === "reachable" ? back.duration_minutes : 0) > day.end) add(last.stop.id, "RETURN_TO_BASE");
  }
  for (const stop of draft.stops) if (stop.lock && !assigned.has(stop.id)) add(stop.id, "LOCK_CONFLICT");
  const budget = summarizeTripBudget(draft.budget, draft.party_size, calendar.length, draft.stops.map((stop) => stop.cost_estimate));
  if (budget.status === "over_budget") warnings.add("BUDGET_EXCEEDED");
  if (budget.unknown_cost_count) warnings.add("COSTS_INCOMPLETE");
  return { valid: conflicts.length === 0, entries: structuredClone(entries), conflicts, unscheduled: draft.stops.filter((stop) => !assigned.has(stop.id)).map((stop) => ({ stop_id: stop.id, reason: stop.lock ? "LOCK_CONFLICT" as const : "UNKNOWN" as const, message: stop.lock ? "LOCK_NOT_ASSIGNED" : "NOT_ASSIGNED" })), budget, warnings: [...warnings].sort() };
}
