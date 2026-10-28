import { expect, test } from "vitest";
import { validateManualPlan } from "@/domain/planning/manual";
import { routingInputForDraft } from "@/domain/routing/matrix";
import { ApproximateRoutingProvider } from "@/adapters/routing/approximate";
import { fixedClock, plannerDraft, plannerStop } from "../fixtures/planner";

test("manual validation preserves invalid user order/date/time and reports overlaps, locks and unassigned points", async () => {
  const draft = plannerDraft({ planning_mode: "manual", stops: [plannerStop("a", { lock: { plan_date: "2026-11-06", start_local: "14:00", sort_index: 0 } }), plannerStop("b"), plannerStop("unassigned")] });
  const entries = [{ stop_id: "b", plan_date: "2026-11-06", start_local: "15:00" }, { stop_id: "a", plan_date: "2026-11-06", start_local: "14:30" }];
  const before = structuredClone({ draft, entries });
  const result = validateManualPlan(draft, entries, await new ApproximateRoutingProvider().estimateMatrix(routingInputForDraft(draft)), fixedClock);
  expect(result.valid).toBe(false); expect(result.entries).toEqual(entries);
  expect(result.conflicts.map((conflict) => conflict.code)).toEqual(expect.arrayContaining(["OVERLAP", "LOCK_CONFLICT"]));
  expect(result.unscheduled).toEqual([{ stop_id: "unassigned", reason: "UNKNOWN", message: "NOT_ASSIGNED" }]);
  expect({ draft, entries }).toEqual(before);
});
test("manual checks local bounds, split hours, directed travel and return while retaining every assignment", async () => {
  const draft = plannerDraft({ planning_mode: "manual", end_date: "2026-11-06", arrival_local_time: "17:00", departure_local_time: "19:00", stops: [plannerStop("a"), plannerStop("b", { transport_constraint: "manual_transfer" })] });
  const entries = [{ stop_id: "a", plan_date: "2026-11-06", start_local: "16:00" }, { stop_id: "b", plan_date: "2026-11-06", start_local: "18:30" }];
  const result = validateManualPlan(draft, entries, await new ApproximateRoutingProvider().estimateMatrix(routingInputForDraft(draft)), fixedClock);
  expect(result.conflicts.map((conflict) => conflict.code)).toEqual(expect.arrayContaining(["DAY_BOUNDS", "TRAVEL", "MANUAL_TRANSFER_REQUIRED", "RETURN_TO_BASE"]));
  expect(result.entries).toEqual(entries); expect(result.warnings).toContain("HOURS_UNVERIFIED");
});
test("manual duplicates/unknown IDs and bad local times are explicit without optimizer repair", async () => {
  const draft = plannerDraft({ planning_mode: "manual", stops: [plannerStop("a")] });
  const entries = [{ stop_id: "a", plan_date: "2026-11-06", start_local: "25:00" }, { stop_id: "a", plan_date: "2026-11-06", start_local: "15:00" }, { stop_id: "missing", plan_date: "2026-11-06", start_local: "16:00" }];
  const result = validateManualPlan(draft, entries, await new ApproximateRoutingProvider().estimateMatrix(routingInputForDraft(draft)), fixedClock);
  expect(result.entries).toEqual(entries); expect(result.conflicts.map((conflict) => conflict.code)).toEqual(expect.arrayContaining(["ASSIGNMENT_TIME", "DUPLICATE_ASSIGNMENT", "UNKNOWN_STOP"]));
});

test("omitting a locked assignment is an explicit conflict rather than dropping the lock", async () => {
  const draft = plannerDraft({ planning_mode: "manual", stops: [plannerStop("a", { lock: { plan_date: "2026-11-06", start_local: "14:00", sort_index: 0 } })] });
  const result = validateManualPlan(draft, [], await new ApproximateRoutingProvider().estimateMatrix(routingInputForDraft(draft)), fixedClock);
  expect(result.valid).toBe(false); expect(result.conflicts).toContainEqual({ stop_id: "a", code: "LOCK_CONFLICT" });
  expect(result.unscheduled).toEqual([{ stop_id: "a", reason: "LOCK_CONFLICT", message: "LOCK_NOT_ASSIGNED" }]);
});
