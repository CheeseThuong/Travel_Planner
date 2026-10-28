import { expect, test } from "vitest";
import { buildTripCalendar, openingWindows, lockConflicts } from "@/domain/planning/calendar";
import { fixedClock, plannerDraft, plannerStop } from "../fixtures/planner";
import type { OpeningHours } from "@/domain/model/trip";

const hours: OpeningHours = { state: "verified_editorial", source: "Synthetic fixture", checked_at: "2026-10-20", intervals: [{ weekday: 5, start_local: "09:00", end_local: "12:00" }, { weekday: 5, start_local: "14:00", end_local: "17:00" }, { weekday: 5, start_local: "22:00", end_local: "02:00" }] };
test("calendar intersects local edge days and keeps explicit clipped breaks", () => {
  const days = buildTripCalendar(plannerDraft());
  expect(days.map((day) => [day.date, day.start, day.end])).toEqual([["2026-11-06", 630, 1260], ["2026-11-07", 480, 1260], ["2026-11-08", 480, 960]]);
  expect(days[0].breaks).toEqual([{ start: 720, end: 780 }]);
  const partial = buildTripCalendar(plannerDraft({ end_date: "2026-11-06", arrival_local_time: "17:00", departure_local_time: "19:00" }));
  expect(partial[0]).toMatchObject({ start: 1020, end: 1140, breaks: [] });
});
test("verified split/overnight windows carry into the next weekday without crossing a local day", () => {
  expect(openingWindows(hours, "2026-11-06", fixedClock).windows).toEqual([{ start: 540, end: 720 }, { start: 840, end: 1020 }, { start: 1320, end: 1440 }]);
  expect(openingWindows(hours, "2026-11-07", fixedClock).windows).toEqual([{ start: 0, end: 120 }]);
  expect(openingWindows(hours, "2026-11-08", fixedClock).windows).toEqual([]);
  expect(openingWindows({ state: "hours_unknown" }, "2026-11-08", fixedClock)).toEqual({ windows: [{ start: 0, end: 1440 }], warnings: ["HOURS_UNVERIFIED"] });
  expect(openingWindows(hours, "2026-11-06", fixedClock).warnings).toContain("HOURS_HOLIDAYS_UNVERIFIED");
});
test("verified hours require real provenance, valid intervals and injected-clock chronology", () => {
  for (const invalid of [{ ...hours, source: "" }, { ...hours, checked_at: "2027-01-01" }, { ...hours, checked_at: "2026-02-30" }, { ...hours, intervals: [{ weekday: 7, start_local: "09:00", end_local: "17:00" }] }, { ...hours, intervals: [{ weekday: 5, start_local: "09:00", end_local: "09:00" }] }]) {
    expect(() => openingWindows(invalid, "2026-11-06", fixedClock)).toThrow();
  }
});

test("lock absolute order conflicts are reported and zero-availability days remain present", () => {
  const input = plannerDraft({ stops: [plannerStop("early", { lock: { plan_date: "2026-11-06", start_local: "14:00", sort_index: 1 } }), plannerStop("late", { lock: { plan_date: "2026-11-06", start_local: "17:00", sort_index: 0 } })] });
  expect(lockConflicts(input, buildTripCalendar(input), fixedClock).map((entry) => entry.message)).toEqual(["LOCK_ORDER", "LOCK_ORDER"]);
  const empty = buildTripCalendar(plannerDraft({ end_date: "2026-11-06", arrival_local_time: "22:00", departure_local_time: "23:00" }));
  expect(empty).toHaveLength(1);
  expect(empty[0].end - empty[0].start).toBe(0);
});
test("lock conflicts retain every locked input and diagnose bounds, hours, breaks and overlap", () => {
  const input = plannerDraft({ stops: [plannerStop("outside", { lock: { plan_date: "2026-11-06", start_local: "08:00", sort_index: 0 } }), plannerStop("break", { lock: { plan_date: "2026-11-06", start_local: "12:00", sort_index: 1 } }), plannerStop("overlap", { lock: { plan_date: "2026-11-06", start_local: "12:30", sort_index: 2 } }), plannerStop("closed", { hours: { ...hours, intervals: [] }, lock: { plan_date: "2026-11-07", start_local: "14:00", sort_index: 0 } })] });
  const before = structuredClone(input);
  const conflicts = lockConflicts(input, buildTripCalendar(input), fixedClock);
  expect(new Set(conflicts.map((conflict) => conflict.stop_id))).toEqual(new Set(["outside", "break", "overlap", "closed"]));
  expect(input).toEqual(before);
});
