import { generateHybridPreview, type HybridPreview } from "@/application/planning/hybrid";
import type { DiscoveryPlace } from "@/domain/discovery/place";
import type { DiscoveryPreferences } from "@/domain/discovery/recommendations";
import type { TripDraft } from "@/domain/model/trip";
import type { Clock } from "@/domain/ports/providers";
import type { TransientDiscovery } from "@/domain/discovery/search";

export class PreviewInputError extends Error {}
interface Options { readonly online: boolean; readonly useAi: boolean; readonly useProvider: boolean; readonly signal?: AbortSignal; readonly fetcher?: typeof fetch; readonly clock?: Clock }
export interface WorkbenchPreview { readonly preview: HybridPreview; readonly source: "server" | "local_fallback" | "offline"; readonly transient?: TransientDiscovery }

/** One same-origin request; local fallback never imports keys/config or contacts providers. */
export async function workbenchPreview(draft: TripDraft, preferences: DiscoveryPreferences, catalog: readonly DiscoveryPlace[], options: Options): Promise<WorkbenchPreview> {
  options.signal?.throwIfAborted();
  if (options.online) {
    try {
      const response = await (options.fetcher ?? fetch)("/api/v1/plans/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ draft, preferences, use_ai: options.useAi, use_provider: options.useProvider }), redirect: "error", cache: "no-store", signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(12_000)]) : AbortSignal.timeout(12_000) });
      const value = await response.json();
      if (response.status >= 400 && response.status < 500 && response.status !== 429) throw new PreviewInputError(typeof value?.error?.message === "string" ? value.error.message : "Kiểm tra lại điểm đã khóa, ngày và bộ lọc gợi ý.");
      const preview = value?.data as HybridPreview | undefined;
      if (response.ok && preview?.preview_only === true && preview.requires_confirmation === true && Array.isArray(preview.candidate_draft?.stops) && (preview.planning?.status === "candidate" || preview.planning?.status === "conflict") && JSON.stringify(preview.original_stop_ids) === JSON.stringify(draft.stops.map(stop => stop.id))) return { preview, source: "server",...(value.transient?.retention==="request_only"&&value.transient.saving_allowed===false&&Array.isArray(value.transient.places)&&value.transient.places.length<=100?{transient:value.transient}:{}) };
    } catch (error) { options.signal?.throwIfAborted(); if (error instanceof PreviewInputError) throw error; }
  }
  const preview = await generateHybridPreview(draft, preferences, { catalog, clock: options.clock ?? { now: () => new Date() }, seed: 42, plan_run_id: crypto.randomUUID(), use_ai: options.useAi, use_discovery: options.useProvider }, options.signal);
  return { preview, source: options.online ? "local_fallback" : "offline" };
}
