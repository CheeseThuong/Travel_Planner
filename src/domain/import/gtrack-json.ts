import type { Coordinates } from "@/domain/model/trip";
import { normalizePlaceText, type PlaceCategory } from "@/domain/discovery/place";

export interface GTrackPlace {
  readonly title: string;
  readonly address: string | null;
  readonly location: Coordinates;
  readonly category: PlaceCategory | null;
  readonly originalCategories: readonly string[];
  readonly placeId: string | null;
  readonly cid: string | null;
  readonly mapsUrl: string | null;
}

export class GTrackImportError extends Error {
  constructor(message: string) { super(message); this.name = "GTrackImportError"; }
}

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new GTrackImportError("JSON không có cấu trúc gTrack hợp lệ.");
  return value as Record<string, unknown>;
}
function optionalString(value: unknown, max: number): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().slice(0, max);
}

export function inferGTrackCategory(raw: readonly string[]): PlaceCategory | null {
  for (const category of raw) {
    const value = normalizePlaceText(category);
    if (/khach san|hotel|lodging|homestay|resort|nha nghi|hostel|motel|villa/.test(value)) return "lodging";
    if (/ca phe|cafe|coffee|tra sua|bakery|tiem banh/.test(value)) return "cafe";
    if (/nha hang|restaurant|quan an|am thuc|food|eatery|street food/.test(value)) return "food";
    if (/danh lam|danh thang|di tich|bao tang|museum|temple|historic|landmark|kien truc/.test(value)) return "landmarks";
    if (/thien nhien|thac|ho nuoc|rung|nature|forest|waterfall|beach|bien/.test(value)) return "nature";
    if (/trek|camp|outdoor|di bo duong dai|kayak/.test(value)) return "outdoor";
    if (/viewpoint|ngam canh|san may|check in|view point/.test(value)) return "viewpoint";
    if (/cho|mua sam|shopping|mall|market/.test(value)) return "shopping";
    if (/gia dinh|vui choi|amusement|family|zoo/.test(value)) return "family";
    if (/dich vu|transport|bus|taxi|station/.test(value)) return "services";
  }
  return null;
}

/** Parses user-provided JSON locally. Does not call Google or treat gTrack fields as independently verified. */
export function parseGTrackJson(input: string): GTrackPlace {
  if (!input.trim() || new TextEncoder().encode(input).byteLength > 32768) throw new GTrackImportError("Hãy dán JSON gTrack hợp lệ, tối đa 32 KB.");
  let parsed: unknown;
  try { parsed = JSON.parse(input); }
  catch { throw new GTrackImportError("JSON không hợp lệ. Sao chép JSON gốc trực tiếp từ gTrack, không thêm dấu \\ trước dấu chấm hoặc xuống dòng kiểu Markdown."); }
  const root = object(parsed);
  const business = object(root.business_info);
  const location = object(root.location);
  const coordinates = object(location.coordinates);
  const title = optionalString(business.name, 160);
  const latitude = coordinates.latitude, longitude = coordinates.longitude;
  if (!title) throw new GTrackImportError("Thiếu business_info.name.");
  if (typeof latitude !== "number" || typeof longitude !== "number" || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new GTrackImportError("Thiếu hoặc sai location.coordinates.latitude/longitude.");
  }
  const rawCategories = Array.isArray(root.categories) ? root.categories.filter((v): v is string => typeof v === "string" && v.trim().length > 0).slice(0, 10).map(v => v.trim().slice(0, 100)) : [];
  const technical = root.technical && typeof root.technical === "object" && !Array.isArray(root.technical) ? root.technical as Record<string, unknown> : {};
  const maps = optionalString(location.maps_url, 2048);
  let mapsUrl: string | null = null;
  if (maps) {
    try { const url = new URL(maps); if (url.protocol === "https:" && (["www.google.com", "google.com", "maps.google.com", "www.google.com.vn", "google.com.vn"].includes(url.hostname) && url.pathname.startsWith("/maps"))) mapsUrl = url.href; }
    catch { /* ignore malformed reference; coordinates remain authoritative */ }
  }
  return {
    title, address: optionalString(business.address, 300), location: { lat: latitude, lng: longitude },
    category: inferGTrackCategory(rawCategories), originalCategories: rawCategories,
    placeId: optionalString(location.place_id, 200), cid: optionalString(technical.cid, 50), mapsUrl,
  };
}
