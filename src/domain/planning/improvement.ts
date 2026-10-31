import type { TripDraft, TripStop } from "../model/trip";
import type { Clock, MatrixResult } from "../ports/providers";
import { haversineKm } from "../routing/matrix";
import type { DayWindow } from "./calendar";
import { evaluateDay } from "./feasibility";

export const compareId = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

/** Deterministic farthest-first seeds supply a soft geographic day affinity. */
export function geographicClusters(draft: TripDraft, count: number): ReadonlyMap<string, number> {
  const places = [...draft.stops].sort((a, b) => haversineKm(draft.base_location, a.location) - haversineKm(draft.base_location, b.location) || compareId(a.id, b.id));
  const seeds: TripStop[] = places.length ? [places[0]] : [];
  while (seeds.length < Math.min(count, places.length)) {
    const remaining = places.filter((place) => !seeds.includes(place));
    remaining.sort((a, b) => Math.min(...seeds.map((seed) => haversineKm(b.location, seed.location))) - Math.min(...seeds.map((seed) => haversineKm(a.location, seed.location))) || compareId(a.id, b.id));
    seeds.push(remaining[0]);
  }
  return new Map(places.map((place) => {
    const index = seeds.map((seed, cluster) => ({ cluster, distance: haversineKm(place.location, seed.location) })).sort((a, b) => a.distance - b.distance || a.cluster - b.cluster)[0].cluster;
    return [place.id, index];
  }));
}

/** Re-evaluate every directed edge; a reversal never implies symmetric travel. */
export function improveDay(input: readonly TripStop[], day: DayWindow, draft: TripDraft, matrix: MatrixResult, clock: Clock): TripStop[] {
  let order = [...input], best = evaluateDay(order, day, draft, matrix, clock, true);
  if (!best.valid) return order;
  for (let pass = 0; pass < 5; pass++) {
    let improved = false;
    for (let first = 0; first < order.length - 1; first++) for (let last = first + 1; last < order.length; last++) {
      if (order.slice(first, last + 1).some((stop) => stop.lock)) continue;
      const candidate = [...order.slice(0, first), ...order.slice(first, last + 1).reverse(), ...order.slice(last + 1)];
      const evaluated = evaluateDay(candidate, day, draft, matrix, clock, true);
      if (evaluated.valid && (evaluated.travel_minutes < best.travel_minutes || (evaluated.travel_minutes === best.travel_minutes && evaluated.wait_minutes < best.wait_minutes))) { order = candidate; best = evaluated; improved = true; }
    }
    if (!improved) break;
  }
  return order;
}
