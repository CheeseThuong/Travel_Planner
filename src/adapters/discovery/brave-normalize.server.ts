import { createHash } from "node:crypto";
import { z } from "zod";
import { normalizePlaceText, type DiscoveryPlace, type PlaceCategory, type PlaceSource } from "@/domain/discovery/place";

const schema = z.object({
  type: z.literal("location_result"), title: z.string().trim().min(1).max(200), id: z.string().min(1).max(500).nullish(),
  coordinates: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
  provider_url: z.string().max(2048).nullish(), description: z.string().max(8000).nullish(),
  categories: z.array(z.string().max(120)).max(30).default([]),
  postal_address: z.object({ displayAddress: z.string().max(500) }).nullish(),
});
const categoryWords: Readonly<Record<PlaceCategory, readonly string[]>> = {
  food: ["restaurant", "restaurants", "food", "nha hang", "quan an"], cafe: ["coffee", "cafe", "tea", "bakery", "bakeries", "ca phe"],
  lodging: ["hotel", "hotels", "resort", "resorts", "homestay", "hostel", "hostels", "villa", "villas", "lodging", "khach san"],
  landmarks: ["museum", "museums", "temple", "church", "landmark", "attraction", "cultural", "bao tang", "chua"],
  nature: ["beach", "lake", "mountain", "waterfall", "park", "garden", "bien", "thac", "nui"],
  outdoor: ["hiking", "trekking", "camping", "watersports", "outdoor"], viewpoint: ["viewpoint", "scenic", "lookout"],
  shopping: ["market", "shopping", "store", "cho"], family: ["family", "recreation", "amusement", "playground", "zoo"],
  services: ["airport", "station", "pharmacy", "hospital", "transport", "san bay", "benh vien"],
};
function sourceUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".") || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname) || url.hostname.endsWith(".local")) return null;
    return url.origin + url.pathname;
  } catch { return null; }
}

/** Provider hints remain unverified request-only content, never catalog facts. */
export function normalizeBravePlace(raw: unknown, destination: string, retrievedAt: string): DiscoveryPlace | null {
  const result = schema.safeParse(raw);
  if (!result.success) return null;
  const place = result.data, categories = new Set<PlaceCategory>();
  for (const category of place.categories) {
    const text = ` ${normalizePlaceText(category)} `;
    for (const [group, words] of Object.entries(categoryWords)) if (words.some(word => text.includes(` ${word} `))) categories.add(group as PlaceCategory);
  }
  const source: PlaceSource = { provider: "brave", provider_id: place.id ?? null, url: sourceUrl(place.provider_url), license: "Brave Search API terms; third-party rights unverified", retrieved_at: retrievedAt, retention: "request_only" };
  const key = createHash("sha256").update(JSON.stringify([place.id ?? null, source.url, place.title, place.coordinates])).digest("hex");
  return {
    id: `candidate:brave:${key}`, destination_slug: destination, title_vi: place.title, alternate_names: [], description: place.description ?? "", address: place.postal_address?.displayAddress ?? null,
    location: { lat: place.coordinates[0], lng: place.coordinates[1] }, coordinate_confidence: "provider_unverified", coordinate_source: source, sources: [source],
    categories: [...categories].sort(), tags: place.categories, suggested_duration_min: null, hours: { state: "hours_unknown" }, price: { state: "unknown" }, accessibility: "unknown",
    transport_constraint: "access_unverified", interest_scores: {}, moderation: "draft",
    warnings: ["PROVIDER_COORDINATES_UNVERIFIED", "HOURS_UNVERIFIED", "PRICES_UNKNOWN", "REQUEST_ONLY_DO_NOT_PERSIST", place.id ? "PROVIDER_ID_TEMPORARY" : "PROVIDER_ID_MISSING"],
  };
}
