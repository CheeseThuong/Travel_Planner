import { z } from "zod";
import { placeCategories, type PlaceCategory } from "@/domain/discovery/place";
import type { PlaceSearchProvider, PlaceSearchRequest, PlaceSearchResponse } from "@/domain/discovery/search";
import { normalizeBravePlace } from "./brave-normalize.server";

const inputSchema = z.strictObject({ destination_slug: z.string().regex(/^[a-z0-9-]{1,80}$/), city_name: z.string().trim().min(1).max(120), query: z.string().max(200), category: z.enum(Object.keys(placeCategories) as [PlaceCategory, ...PlaceCategory[]]).optional(), center: z.strictObject({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(), radius_m: z.number().int().min(1).max(100_000).optional(), count: z.number().int().min(1).max(100) });
const responseSchema = z.object({ type: z.literal("locations"), results: z.array(z.unknown()).max(100).nullish() });
const phrases: Readonly<Record<PlaceCategory, string>> = { food: "restaurants local food", cafe: "cafes tea bakeries", lodging: "hotels homestays resorts", landmarks: "landmarks museums cultural attractions", nature: "nature lakes waterfalls beaches", outdoor: "outdoor activities trekking camping", viewpoint: "scenic viewpoints", shopping: "markets local shopping", family: "family recreation", services: "transport essential services" };
export class DiscoveryProviderError extends Error {
  constructor(readonly reason: "quota" | "timeout" | "unavailable" | "invalid_response", readonly requests_attempted: 0 | 1) { super(`Discovery provider ${reason}`); }
}
interface Options { readonly apiKey: string; readonly dailyLimit: number; readonly minuteLimit?: number; readonly timeoutMs?: number; readonly fetcher?: typeof fetch; readonly now?: () => number }

export class BravePlaceSearch implements PlaceSearchProvider {
  private day = "";
  private dayCount = 0;
  private minuteStart = 0;
  private minuteCount = 0;
  private readonly timeout: number;
  private readonly minuteLimit: number;
  constructor(private readonly options: Options) {
    this.timeout = options.timeoutMs ?? 1500; this.minuteLimit = options.minuteLimit ?? 10;
    if (!options.apiKey.trim() || options.apiKey.length > 4096 || !Number.isInteger(options.dailyLimit) || options.dailyLimit < 1 || options.dailyLimit > 10_000 || !Number.isInteger(this.minuteLimit) || this.minuteLimit < 1 || this.minuteLimit > 60 || !Number.isInteger(this.timeout) || this.timeout < 1 || this.timeout > 5000) throw new RangeError("Invalid bounded provider configuration");
  }
  private reserve(now: number) {
    if (!Number.isFinite(now)) throw new RangeError("Invalid provider clock");
    const day = new Date(now).toISOString().slice(0, 10);
    if (day > this.day) { this.day = day; this.dayCount = 0; }
    if (now - this.minuteStart >= 60_000) { this.minuteStart = now; this.minuteCount = 0; }
    if (this.dayCount >= this.options.dailyLimit || this.minuteCount >= this.minuteLimit) throw new DiscoveryProviderError("quota", 0);
    this.dayCount++; this.minuteCount++;
  }
  async search(input: PlaceSearchRequest, signal?: AbortSignal): Promise<PlaceSearchResponse> {
    signal?.throwIfAborted();
    if (!inputSchema.safeParse(input).success) throw new RangeError("Invalid place search input");
    const now = (this.options.now ?? Date.now)(); this.reserve(now);
    const url = new URL("https://api.search.brave.com/res/v1/local/place_search");
    const query = [input.query.trim(), input.category ? phrases[input.category] : ""].filter(Boolean).join(" ");
    if (query) url.searchParams.set("q", query);
    if (input.center) { url.searchParams.set("latitude", String(input.center.lat)); url.searchParams.set("longitude", String(input.center.lng)); }
    else url.searchParams.set("location", `${input.city_name} Vietnam`);
    if (input.radius_m !== undefined) url.searchParams.set("radius", String(input.radius_m));
    url.searchParams.set("count", String(input.count)); url.searchParams.set("country", "VN"); url.searchParams.set("search_lang", "vi"); url.searchParams.set("units", "metric");
    const deadline = new AbortController(), combined = signal ? AbortSignal.any([signal, deadline.signal]) : deadline.signal;
    const timer = setTimeout(() => deadline.abort(), this.timeout);
    let onAbort: (() => void) | undefined;
    try {
      combined.throwIfAborted();
      const aborted = new Promise<never>((_, reject) => { onAbort = () => reject(new DiscoveryProviderError("timeout", 1)); combined.addEventListener("abort", onAbort, { once: true }); });
      return await Promise.race([this.perform(url, input, new Date(now).toISOString(), combined), aborted]);
    } catch (error) {
      signal?.throwIfAborted();
      if (error instanceof DiscoveryProviderError) throw error;
      throw new DiscoveryProviderError(deadline.signal.aborted ? "timeout" : "unavailable", 1);
    } finally { clearTimeout(timer); if (onAbort) combined.removeEventListener("abort", onAbort); }
  }
  private async perform(url: URL, input: PlaceSearchRequest, retrievedAt: string, signal: AbortSignal): Promise<PlaceSearchResponse> {
    const response = await (this.options.fetcher ?? fetch)(url, { headers: { "X-Subscription-Token": this.options.apiKey, accept: "application/json" }, redirect: "error", cache: "no-store", signal });
    if (!response.ok) throw new DiscoveryProviderError(response.status === 429 ? "quota" : "unavailable", 1);
    const reader = response.body?.getReader();
    if (!reader) throw new DiscoveryProviderError("invalid_response", 1);
    const chunks: Uint8Array[] = []; let size = 0;
    const cancel = () => { void reader.cancel().catch(() => {}); };
    signal.addEventListener("abort", cancel, { once: true });
    try {
      for (;;) { const chunk = await reader.read(); signal.throwIfAborted(); if (chunk.done) break; size += chunk.value.byteLength; if (size > 500_000) { await reader.cancel(); throw new DiscoveryProviderError("invalid_response", 1); } chunks.push(chunk.value); }
    } finally { signal.removeEventListener("abort", cancel); reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let parsed: unknown;
    try { parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { throw new DiscoveryProviderError("invalid_response", 1); }
    const result = responseSchema.safeParse(parsed);
    if (!result.success) throw new DiscoveryProviderError("invalid_response", 1);
    const raw = result.data.results ?? [], places = raw.map(place => normalizeBravePlace(place, input.destination_slug, retrievedAt)).filter(place => place !== null).slice(0, input.count);
    return { places, warnings: ["PROVIDER_WINDOW_NOT_SNAPSHOT", ...(places.length < raw.length ? ["PROVIDER_RESULTS_DISCARDED"] : [])], requests_attempted: 1, window_limited: raw.length >= input.count };
  }
}
