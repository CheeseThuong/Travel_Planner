import { editorialDiscoveryCatalogs } from "@/adapters/discovery/editorial.server";
import { BravePlaceSearch, DiscoveryProviderError } from "@/adapters/discovery/brave.server";
import { getCityGeo } from "@/domain/discovery/cities";
import { filterDiscovery } from "@/domain/discovery/filter";
import { deduplicateDiscovery } from "@/domain/discovery/dedup";
import type { DiscoveryPage, PlaceSearchProvider } from "@/domain/discovery/search";
import { findDestination } from "@/domain/model/destination";
import { parseServerEnv } from "@/lib/config/env.server";
import { ApiError, readJson, success, withApi } from "./http.server";
import { createRequestLimiter } from "./request-limit.server";
import { discoveryInputSchema, discoveryPageSchema } from "./discovery-schema.server";

let runtimeProvider: BravePlaceSearch | undefined;
export function configuredDiscoveryProvider(): PlaceSearchProvider | undefined {
  try {
    const env = parseServerEnv();
    if (!env.BRAVE_ENABLED) return undefined;
    return runtimeProvider ??= new BravePlaceSearch({ apiKey: env.BRAVE_API_KEY!, dailyLimit: env.BRAVE_DAILY_REQUEST_LIMIT, minuteLimit: env.BRAVE_MINUTE_REQUEST_LIMIT });
  } catch { throw new ApiError(503, "PROVIDER_UNAVAILABLE", "Tìm kiếm mở rộng chưa được cấu hình hợp lệ. Danh mục trên máy vẫn dùng được."); }
}

export function createDiscoveryHandler(injectedProvider?: PlaceSearchProvider): (request: Request) => Promise<Response> {
  const limit = createRequestLimiter(40, 60_000);
  return request => withApi(request, async id => {
    limit();
    if (request.signal.aborted) throw new ApiError(503, "PROVIDER_UNAVAILABLE", "Yêu cầu tìm kiếm đã dừng.");
    const input = await readJson(request, discoveryInputSchema, 8192), city = getCityGeo(input.destination_slug);
    const local = editorialDiscoveryCatalogs[input.destination_slug];
    const candidates = [...local];
    let source: DiscoveryPage["source"] = "catalog", attempted = 0, windowLimited = false;
    const warnings = ["CATALOG_DRAFTS_UNVERIFIED", "ZONES_ARE_EDITORIAL_NOT_CITY_BORDERS", ...(input.radius_m === undefined ? [] : ["RADIUS_IS_SEARCH_BIAS"])];
    if (input.use_provider) {
      const provider = injectedProvider ?? configuredDiscoveryProvider();
      if (!provider) { source = "catalog_fallback"; warnings.push("PROVIDER_DISABLED"); }
      else try {
        const result = await provider.search({ destination_slug: input.destination_slug, city_name: findDestination(input.destination_slug)!.name, query: input.query, ...(input.category === "all" ? {} : { category: input.category }), ...(input.center ? { center: input.center } : {}), ...(input.radius_m === undefined ? {} : { radius_m: input.radius_m }), count: 100 }, request.signal);
        if (result.places.length > 100) throw new DiscoveryProviderError("invalid_response", 1);
        candidates.push(...result.places); source = "mixed"; attempted = result.requests_attempted; windowLimited = result.window_limited; warnings.push(...result.warnings);
      } catch (error) {
        if (request.signal.aborted) throw new ApiError(503, "PROVIDER_UNAVAILABLE", "Yêu cầu tìm kiếm đã dừng.");
        source = "catalog_fallback"; attempted = error instanceof DiscoveryProviderError ? error.requests_attempted : 1;
        warnings.push(error instanceof DiscoveryProviderError && error.reason === "quota" ? "PROVIDER_QUOTA_EXCEEDED" : "PROVIDER_UNAVAILABLE", "CATALOG_FALLBACK");
      }
    }
    const dedup = deduplicateDiscovery(candidates.filter(place => place.destination_slug === input.destination_slug));
    const filtered = filterDiscovery(dedup.places, input, city), offset = input.page * input.page_size;
    if (dedup.truncated) warnings.push("DUPLICATE_REVIEW_WINDOW_LIMIT");
    const confirmationIds = new Set(dedup.confirmation_ids);
    const page: DiscoveryPage = { items: filtered.slice(offset, offset + input.page_size).map(place => ({ ...place, duplicate_confirmation_required: confirmationIds.has(place.id) })), total: filtered.length, next_page: offset + input.page_size < filtered.length ? input.page + 1 : null, warnings: [...new Set(warnings)], source, provider_requests_attempted: attempted, provider_window_limited: windowLimited, duplicate_matches: dedup.matches, duplicates_removed: dedup.removed, duplicate_review_truncated: dedup.truncated };
    return success(discoveryPageSchema.parse(page), id);
  });
}
