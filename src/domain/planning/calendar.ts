import type { OpeningHours, TripDraft } from "../model/trip";
import type { Clock } from "../ports/providers";
import { draftIssues, localTripDates } from "../trip-draft";

export interface TimeWindow { readonly start: number; readonly end: number }
export interface DayWindow extends TimeWindow { readonly date: string; readonly breaks: readonly TimeWindow[] }
export interface LockConflict { readonly stop_id: string; readonly reason: "LOCK_CONFLICT"; readonly message: string }

export function minutes(time: string, allowEndOfDay = false): number {
  if (allowEndOfDay && time === "24:00") return 1440;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new RangeError("Invalid local time");
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}
export function localTime(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 1440) throw new RangeError("Invalid local minute");
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
export const overlaps = (a: TimeWindow, b: TimeWindow): boolean => a.start < b.end && b.start < a.end;

export function buildTripCalendar(draft: TripDraft): DayWindow[] {
  if (draftIssues(draft).length) throw new RangeError("Invalid trip draft");
  return localTripDates(draft.start_date, draft.end_date).map((date) => {
    const start = Math.max(minutes(draft.preferences.day_start), date === draft.start_date ? minutes(draft.arrival_local_time) : 0);
    const end = Math.max(start, Math.min(minutes(draft.preferences.day_end), date === draft.end_date ? minutes(draft.departure_local_time) : 1440));
    const lunch = { start: Math.max(start, 720), end: Math.min(end, 720 + draft.preferences.lunch_buffer_minutes) };
    return { date, start, end, breaks: lunch.start < lunch.end ? [lunch] : [] };
  });
}

export function openingWindows(hours: OpeningHours, date: string, clock: Clock): { windows: TimeWindow[]; warnings: string[] } {
  if (!localTripDates(date, date).length) throw new RangeError("Invalid local date");
  if (hours.state === "hours_unknown") return { windows: [{ start: 0, end: 1440 }], warnings: ["HOURS_UNVERIFIED"] };
  const checked = Date.parse(hours.checked_at), now = clock.now().getTime();
  if (!hours.source.trim() || !/^\d{4}-\d{2}-\d{2}(?:T.*(?:Z|[+-]\d{2}:\d{2}))?$/.test(hours.checked_at) || !localTripDates(hours.checked_at.slice(0, 10), hours.checked_at.slice(0, 10)).length || !Number.isFinite(checked) || !Number.isFinite(now) || checked > now) throw new RangeError("Invalid verified hours provenance");
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay(), previous = (weekday + 6) % 7;
  const windows: TimeWindow[] = [];
  for (const interval of hours.intervals) {
    const start = minutes(interval.start_local), end = minutes(interval.end_local, true);
    if (!Number.isInteger(interval.weekday) || interval.weekday < 0 || interval.weekday > 6 || start === end) throw new RangeError("Invalid opening interval");
    if (start < end && interval.weekday === weekday) windows.push({ start, end });
    if (start > end) {
      if (interval.weekday === weekday) windows.push({ start, end: 1440 });
      if (interval.weekday === previous && end > 0) windows.push({ start: 0, end });
    }
  }
  windows.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: TimeWindow[] = [];
  for (const window of windows) {
    const last = merged.at(-1);
    if (last && window.start <= last.end) merged[merged.length - 1] = { start: last.start, end: Math.max(last.end, window.end) };
    else merged.push(window);
  }
  return { windows: merged, warnings: ["HOURS_HOLIDAYS_UNVERIFIED"] };
}

export function lockConflicts(draft: TripDraft, calendar: readonly DayWindow[], clock: Clock): LockConflict[] {
  const conflicts = new Map<string, Set<string>>();
  const add = (id: string, message: string) => { const messages = conflicts.get(id) ?? new Set<string>(); messages.add(message); conflicts.set(id, messages); };
  const locked = draft.stops.filter((stop) => stop.lock).map((stop) => ({ stop, lock: stop.lock!, start: minutes(stop.lock!.start_local), end: minutes(stop.lock!.start_local) + stop.requested_duration_min }));
  for (const item of locked) {
    const day = calendar.find((entry) => entry.date === item.lock.plan_date);
    if (!day || item.start < day.start || item.end > day.end || item.lock.sort_index >= 8) add(item.stop.id, "LOCK_OUTSIDE_DAY");
    if (day?.breaks.some((pause) => overlaps(item, pause))) add(item.stop.id, "LOCK_OVERLAPS_BREAK");
    if (!openingWindows(item.stop.hours, item.lock.plan_date, clock).windows.some((window) => item.start >= window.start && item.end <= window.end)) add(item.stop.id, "LOCK_OUTSIDE_HOURS");
  }
  for (let first = 0; first < locked.length; first++) for (let second = first + 1; second < locked.length; second++) {
    const a = locked[first], b = locked[second];
    if (a.lock.plan_date !== b.lock.plan_date) continue;
    if (overlaps(a, b)) { add(a.stop.id, "LOCK_OVERLAP"); add(b.stop.id, "LOCK_OVERLAP"); }
    if (a.lock.sort_index === b.lock.sort_index || (a.start < b.start) !== (a.lock.sort_index < b.lock.sort_index)) { add(a.stop.id, "LOCK_ORDER"); add(b.stop.id, "LOCK_ORDER"); }
  }
  return [...conflicts].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([stop_id, messages]) => ({ stop_id, reason: "LOCK_CONFLICT", message: [...messages].sort().join(", ") }));
}
