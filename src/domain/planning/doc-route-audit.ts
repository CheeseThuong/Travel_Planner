/** Pure, deterministic accounting audit for the itinerary generator.
 * Does not replace the production time-window/routing solver.
 */
export interface RouteAudit {
  readonly ok: boolean;
  readonly missing: readonly string[];
  readonly unknown: readonly string[];
  readonly duplicateScheduled: readonly string[];
  readonly duplicateUnscheduled: readonly string[];
  readonly overlap: readonly string[];
}
export function auditRouteAccounting(selected: readonly string[], scheduled: readonly string[], unscheduled: readonly string[]): RouteAudit {
  const unique = (values: readonly string[]) => new Set(values);
  const a = unique(selected), b = unique(scheduled), c = unique(unscheduled);
  const twice = (values: readonly string[]) => [...values].filter((id,index) => values.indexOf(id)!==index).filter((id,index,arr)=>arr.indexOf(id)===index).sort();
  const missing = [...a].filter(id=>!b.has(id)&&!c.has(id)).sort();
  const unknown = [...b,...c].filter((id,index,arr)=>!a.has(id)&&arr.indexOf(id)===index).sort();
  const overlap = [...b].filter(id=>c.has(id)).sort();
  const duplicateScheduled=twice(scheduled),duplicateUnscheduled=twice(unscheduled);
  return {ok:!missing.length&&!unknown.length&&!overlap.length&&!duplicateScheduled.length&&!duplicateUnscheduled.length&&a.size===selected.length,missing,unknown,overlap,duplicateScheduled,duplicateUnscheduled};
}
