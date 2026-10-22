import { describe, expect, test } from "vitest";
import { MAX_VND_INPUT, summarizeTripBudget } from "@/domain/budget";
import type { TripBudget } from "@/domain/model/trip";

const budget = (total_vnd: number | null, overrides: Partial<TripBudget["known_costs_vnd"]> = {}): TripBudget => ({
  currency: "VND",
  total_vnd,
  known_costs_vnd: { lodging: 0, transport: 0, meals: 0, other: 0, ...overrides },
});

describe("trip budget summary", () => {
  test("calculates a whole-VND allowance for the group and each traveler", () => {
    const result = summarizeTripBudget(budget(12_000_000, { lodging: 2_000_000 }), 4, 3, []);
    expect(result).toEqual({
      status: "within_known_budget",
      total_budget_vnd: 12_000_000,
      known_estimated_spend_vnd: 2_000_000,
      remaining_known_budget_vnd: 10_000_000,
      budget_per_person_vnd: 3_000_000,
      available_per_group_day_vnd: 3_333_333,
      available_per_person_day_vnd: 833_333,
      unknown_cost_count: 0,
    });
  });

  test("multiplies per-person stop estimates and keeps unknown costs explicit", () => {
    const result = summarizeTripBudget(budget(5_000_000), 3, 2, [
      { provenance: "user_entered", amount_vnd: 200_000, applies_to: "per_person" },
      { provenance: "user_entered", amount_vnd: 100_000, applies_to: "group" },
      { provenance: "unknown" },
    ]);
    expect(result.known_estimated_spend_vnd).toBe(700_000);
    expect(result.unknown_cost_count).toBe(1);
    expect(result.status).toBe("incomplete_estimate");
  });

  test("reports over-budget and never returns a negative spending allowance", () => {
    const result = summarizeTripBudget(budget(1_000_000, { transport: 1_500_000 }), 2, 2, []);
    expect(result.status).toBe("over_budget");
    expect(result.remaining_known_budget_vnd).toBe(-500_000);
    expect(result.available_per_group_day_vnd).toBe(0);
    expect(result.available_per_person_day_vnd).toBe(0);
  });

  test("distinguishes no budget from a zero-VND budget", () => {
    expect(summarizeTripBudget(budget(null), 1, 1, []).status).toBe("no_budget");
    expect(summarizeTripBudget(budget(0), 1, 1, []).status).toBe("within_known_budget");
  });

  test.each([
    [0, 1], [31, 1], [1.5, 1], [1, 0], [1, 8],
  ])("rejects invalid party/day bounds: %s/%s", (partySize, dayCount) => {
    expect(() => summarizeTripBudget(budget(1), partySize, dayCount, [])).toThrow(RangeError);
  });

  test("rejects fractional, negative and oversized money", () => {
    expect(() => summarizeTripBudget(budget(0.5), 1, 1, [])).toThrow(RangeError);
    expect(() => summarizeTripBudget(budget(-1), 1, 1, [])).toThrow(RangeError);
    expect(() => summarizeTripBudget(budget(MAX_VND_INPUT + 1), 1, 1, [])).toThrow(RangeError);
  });
});
