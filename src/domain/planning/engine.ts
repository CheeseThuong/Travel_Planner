import { summarizeTripBudget, type BudgetSummary } from "../budget";
import type { EstimateSource, PlanCandidate, TripDraft, TripStop, UnscheduledReason } from "../model/trip";
import type { Clock, MatrixResult } from "../ports/providers";
import { assertMatrix, routingInputForDraft } from "../routing/matrix";
import { buildTripCalendar, localTime, lockConflicts, openingWindows } from "./calendar";
import { cellBetween, evaluateDay, paceCapacity, type PlannerVisit, type ReturnLeg } from "./feasibility";
import { compareId, geographicClusters, improveDay } from "./improvement";

export interface PlanningContext { readonly clock: Clock; readonly seed: number; readonly plan_run_id: string }
export interface Unscheduled { readonly stop_id: string; readonly reason: UnscheduledReason; readonly message: string }
export interface EngineCandidate extends PlanCandidate {
  readonly days: readonly { date: string; stops: readonly PlannerVisit[]; breaks: readonly { start_local: string; end_local: string }[]; return_leg?: ReturnLeg }[];
  readonly unfulfilled_required: readonly string[];
  readonly budget: BudgetSummary;
  readonly score: Readonly<{ scheduled_required: number; scheduled_optional: number; travel_minutes: number; wait_minutes: number }>;
  readonly diagnostics: Readonly<{ feasibility: "tentative" | "feasible"; matrix_elements_requested: number | null; matrix_elements_reserved: number; routing_sources: readonly EstimateSource[] }>;
}
export type PlanningResult = { readonly status: "candidate"; readonly candidate: EngineCandidate; readonly unscheduled: readonly Unscheduled[] } | { readonly status: "conflict"; readonly candidate: null; readonly conflicts: readonly { stop_id: string; message: string }[]; readonly unscheduled: readonly Unscheduled[] };

export { routingInputForDraft } from "../routing/matrix";
const knownCost = (stop: TripStop, partySize: number): number | null => stop.cost_estimate.provenance === "unknown" ? null : stop.cost_estimate.amount_vnd * (stop.cost_estimate.applies_to === "per_person" ? partySize : 1);
const gaps = (order: readonly TripStop[]) => order.reduce((sum, stop, index) => sum + (stop.lock ? Math.max(0, stop.lock.sort_index - index) : 0), 0);
const compareKeys = (a: readonly number[], b: readonly number[]): number => { for (let index = 0; index < a.length; index++) if (a[index] !== b[index]) return a[index] - b[index]; return 0; };

export function generatePlan(draft: TripDraft, matrix: MatrixResult, context: PlanningContext): PlanningResult {
  if (draft.planning_mode === "manual") throw new RangeError("MANUAL_MODE_REQUIRES_VALIDATION");
  const now = context.clock.now().getTime();
  if (!Number.isFinite(now) || !Number.isSafeInteger(context.seed) || !context.plan_run_id) throw new RangeError("Invalid deterministic planning context");
  const clock: Clock = { now: () => new Date(now) };
  const calendar = buildTripCalendar(draft);
  assertMatrix(routingInputForDraft(draft), matrix);
  const conflictResult = (conflicts: readonly { stop_id: string; message: string }[]): PlanningResult => ({ status: "conflict", candidate: null, conflicts, unscheduled: [...draft.stops].sort((a, b) => compareId(a.id, b.id)).map((stop) => ({ stop_id: stop.id, reason: stop.lock ? "LOCK_CONFLICT" : "UNKNOWN", message: "PLAN_BLOCKED_BY_LOCK" })) });
  const staticConflicts = lockConflicts(draft, calendar, clock);
  if (staticConflicts.length) return conflictResult(staticConflicts);
  const orders: TripStop[][] = calendar.map((day) => draft.stops.filter((stop) => stop.lock?.plan_date === day.date).sort((a, b) => compareId(a.lock!.start_local, b.lock!.start_local) || compareId(a.id, b.id)));
  const clusters = geographicClusters(draft, calendar.length);
  const unscheduled = new Map<string, Unscheduled>();

  function insert(stop: TripStop): boolean {
    const failures: UnscheduledReason[] = [];
    let best: { day: number; order: TripStop[]; key: number[] } | undefined;
    const totalGaps = orders.reduce((sum, order) => sum + gaps(order), 0);
    for (const [day, current] of orders.entries()) {
      if (current.length >= paceCapacity[draft.pace]) { failures.push("CAPACITY"); continue; }
      const before = evaluateDay(current, calendar[day], draft, matrix, clock, false);
      for (let position = 0; position <= current.length; position++) {
        const order = [...current.slice(0, position), stop, ...current.slice(position)];
        const after = evaluateDay(order, calendar[day], draft, matrix, clock, false);
        if (!after.valid) { failures.push(after.failure); continue; }
        const key = [totalGaps - gaps(current) + gaps(order), after.travel_minutes - (before.valid ? before.travel_minutes : 0), clusters.get(stop.id) === day ? 0 : 1, after.wait_minutes, day, position];
        if (!best || compareKeys(key, best.key) < 0) best = { day, order, key };
      }
    }
    if (best) { orders[best.day] = best.order; unscheduled.delete(stop.id); return true; }
    let reason: UnscheduledReason = failures.every((failure) => failure === "CAPACITY") ? "CAPACITY" : failures.every((failure) => failure === "UNREACHABLE" || failure === "CAPACITY") ? "UNREACHABLE" : "TIME_WINDOW";
    if (stop.transport_constraint === "manual_transfer") { reason = "UNREACHABLE"; unscheduled.set(stop.id, { stop_id: stop.id, reason, message: "MANUAL_TRANSFER_REQUIRED" }); return false; }
    if (calendar.every((day) => openingWindows(stop.hours, day.date, clock).windows.length === 0)) reason = "CLOSED";
    else {
      const outward = cellBetween(matrix, "base", stop.id), back = cellBetween(matrix, stop.id, "base");
      if (reason === "TIME_WINDOW" && outward.status === "reachable" && back.status === "reachable" && calendar.every((day) => outward.duration_minutes + (draft.preferences.return_to_base ? back.duration_minutes : 0) > day.end - day.start)) reason = "TRAVEL_TOO_LONG";
    }
    unscheduled.set(stop.id, { stop_id: stop.id, reason, message: reason }); return false;
  }

  const closing = (stop: TripStop) => Math.min(1440, ...calendar.flatMap((day) => openingWindows(stop.hours, day.date, clock).windows.map((window) => window.end)));
  let pending = draft.stops.filter((stop) => stop.is_required && !stop.lock).sort((a, b) => closing(a) - closing(b) || b.requested_duration_min - a.requested_duration_min || compareId(a.id, b.id));
  while (pending.length) { const remaining = pending.filter((stop) => !insert(stop)); if (remaining.length === pending.length) break; pending = remaining; }
  const requiredCosts = orders.flat().reduce((sum, stop) => sum + (knownCost(stop, draft.party_size) ?? 0), 0);
  const fixedCosts = Object.values(draft.budget.known_costs_vnd).reduce((sum, value) => sum + value, 0);
  const remainingBudget = draft.budget.total_vnd === null ? Infinity : draft.budget.total_vnd - fixedCosts - requiredCosts;
  const optional = draft.stops.filter((stop) => !stop.is_required && !stop.lock).sort((a, b) => {
    const first = knownCost(a, draft.party_size), second = knownCost(b, draft.party_size);
    const rank = (cost: number | null) => cost === null ? 2 : cost <= remainingBudget ? 0 : 1;
    return rank(first) - rank(second) || (first ?? Infinity) - (second ?? Infinity) || (clusters.get(a.id) ?? 0) - (clusters.get(b.id) ?? 0) || compareId(a.id, b.id);
  });
  optional.forEach(insert);
  // New optional connectors can make a previously unreachable required point feasible.
  for (const stop of pending) {
    if (insert(stop)) continue;
    const replacements = orders.flat().filter((entry) => !entry.is_required && !entry.lock).sort((a, b) => compareId(a.id, b.id));
    for (const optionalStop of replacements) {
      const savedOrders = orders.map((order) => [...order]), savedReasons = new Map(unscheduled);
      for (let day = 0; day < orders.length; day++) orders[day] = orders[day].filter((entry) => entry.id !== optionalStop.id);
      if (insert(stop) && orders.every((order, day) => evaluateDay(order, calendar[day], draft, matrix, clock, true).valid)) {
        unscheduled.set(optionalStop.id, { stop_id: optionalStop.id, reason: "CAPACITY", message: "PRIORITIZED_REQUIRED" }); break;
      }
      savedOrders.forEach((order, day) => { orders[day] = order; });
      unscheduled.clear(); savedReasons.forEach((reason, id) => unscheduled.set(id, reason));
    }
  }
  const evaluated = orders.map((order, index) => evaluateDay(improveDay(order, calendar[index], draft, matrix, clock), calendar[index], draft, matrix, clock, true));
  const invalid = evaluated.flatMap((day, index) => day.valid ? [] : orders[index].filter((stop) => stop.lock).map((stop) => ({ stop_id: stop.id, message: "LOCK_TRAVEL_OR_POSITION_CONFLICT" })));
  if (invalid.length) return conflictResult(invalid);
  if (evaluated.some((day) => !day.valid)) throw new Error("Planner invariant: accepted day became invalid");
  const scheduled = new Set(evaluated.flatMap((day) => day.stops.map((stop) => stop.stop_id)));
  for (const stop of draft.stops) if (!scheduled.has(stop.id) && !unscheduled.has(stop.id)) unscheduled.set(stop.id, { stop_id: stop.id, reason: "UNKNOWN", message: "NO_FEASIBLE_INSERTION" });
  const missing = [...unscheduled.values()].filter((stop) => !scheduled.has(stop.stop_id)).sort((a, b) => compareId(a.stop_id, b.stop_id));
  const unfulfilled = draft.stops.filter((stop) => stop.is_required && !scheduled.has(stop.id)).map((stop) => stop.id).sort(compareId);
  const budget = summarizeTripBudget(draft.budget, draft.party_size, calendar.length, draft.stops.filter((stop) => scheduled.has(stop.id)).map((stop) => stop.cost_estimate));
  const sources = [...new Set(evaluated.flatMap((day) => [...day.stops.map((stop) => stop.estimate_source), ...(day.return_leg ? [day.return_leg.estimate_source] : [])]))].sort();
  const warnings = [...new Set([...matrix.warnings, ...evaluated.flatMap((day) => day.stops.flatMap((stop) => stop.warnings)), "ARRIVAL_STARTS_AT_BASE", ...(draft.base_location.temporary ? ["TEMPORARY_BASE"] : []), ...(unfulfilled.length ? ["UNFULFILLED_REQUIRED"] : []), ...(budget.unknown_cost_count ? ["COSTS_INCOMPLETE"] : []), ...(budget.status === "over_budget" ? ["BUDGET_EXCEEDED"] : [])])].sort();
  const candidate: EngineCandidate = { plan_run_id: context.plan_run_id, input_version: draft.version, engine_version: "planner-v1", seed: context.seed, days: evaluated.map((day, index) => ({ date: calendar[index].date, stops: day.stops, breaks: calendar[index].breaks.map((pause) => ({ start_local: localTime(pause.start), end_local: localTime(pause.end) })), ...(day.return_leg ? { return_leg: day.return_leg } : {}) })), unscheduled: missing, unfulfilled_required: unfulfilled, budget, score: { scheduled_required: draft.stops.filter((stop) => stop.is_required && scheduled.has(stop.id)).length, scheduled_optional: draft.stops.filter((stop) => !stop.is_required && scheduled.has(stop.id)).length, travel_minutes: evaluated.reduce((sum, day) => sum + day.travel_minutes, 0), wait_minutes: evaluated.reduce((sum, day) => sum + day.wait_minutes, 0) }, warnings, diagnostics: { feasibility: warnings.length ? "tentative" : "feasible", matrix_elements_requested: matrix.elements_requested, matrix_elements_reserved: matrix.node_ids.length ** 2, routing_sources: sources } };
  if (scheduled.size + missing.length !== draft.stops.length) throw new Error("Planner invariant: selection accounting mismatch");
  return { status: "candidate", candidate, unscheduled: missing };
}
