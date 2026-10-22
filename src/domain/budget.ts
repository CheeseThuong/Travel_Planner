import type { CostEstimate, TripBudget } from "./model/trip";

export const MAX_VND_INPUT = 1_000_000_000_000;

export type BudgetStatus = "no_budget" | "within_known_budget" | "over_budget" | "incomplete_estimate";

export interface BudgetSummary {
  readonly status: BudgetStatus;
  readonly total_budget_vnd: number | null;
  readonly known_estimated_spend_vnd: number;
  readonly remaining_known_budget_vnd: number | null;
  readonly budget_per_person_vnd: number | null;
  readonly available_per_group_day_vnd: number | null;
  readonly available_per_person_day_vnd: number | null;
  readonly unknown_cost_count: number;
}

function assertWholeVnd(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_VND_INPUT) {
    throw new RangeError(`${name} must be a whole VND amount from 0 to ${MAX_VND_INPUT}`);
  }
}

export function summarizeTripBudget(
  budget: TripBudget,
  partySize: number,
  dayCount: number,
  stopCosts: readonly CostEstimate[],
): BudgetSummary {
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 30) throw new RangeError("partySize must be from 1 to 30");
  if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > 7) throw new RangeError("dayCount must be from 1 to 7");
  if (budget.currency !== "VND") throw new RangeError("MVP budget currency must be VND");
  if (budget.total_vnd !== null) assertWholeVnd(budget.total_vnd, "total_vnd");

  const fixedValues = Object.values(budget.known_costs_vnd);
  fixedValues.forEach((value, index) => assertWholeVnd(value, `known_costs_vnd[${index}]`));
  let knownSpend = fixedValues.reduce((sum, value) => sum + value, 0);
  let unknownCostCount = 0;
  for (const [index, cost] of stopCosts.entries()) {
    if (cost.provenance === "unknown") {
      unknownCostCount += 1;
      continue;
    }
    assertWholeVnd(cost.amount_vnd, `stopCosts[${index}].amount_vnd`);
    knownSpend += cost.applies_to === "per_person" ? cost.amount_vnd * partySize : cost.amount_vnd;
  }
  if (!Number.isSafeInteger(knownSpend)) throw new RangeError("known spend exceeds safe integer range");

  const total = budget.total_vnd;
  const remaining = total === null ? null : total - knownSpend;
  const status: BudgetStatus = total === null
    ? "no_budget"
    : knownSpend > total
      ? "over_budget"
      : unknownCostCount > 0
        ? "incomplete_estimate"
        : "within_known_budget";

  return {
    status,
    total_budget_vnd: total,
    known_estimated_spend_vnd: knownSpend,
    remaining_known_budget_vnd: remaining,
    budget_per_person_vnd: total === null ? null : Math.floor(total / partySize),
    available_per_group_day_vnd: remaining === null ? null : Math.floor(Math.max(0, remaining) / dayCount),
    available_per_person_day_vnd: remaining === null ? null : Math.floor(Math.max(0, remaining) / partySize / dayCount),
    unknown_cost_count: unknownCostCount,
  };
}
