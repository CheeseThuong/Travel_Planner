import type { Coordinates } from "../model/trip";
import { haversineKm } from "../routing/matrix";
import { validCoordinates } from "../trip-draft";

export type GeoFence = Readonly<{ kind: "bbox"; south: number; north: number; west: number; east: number }> | Readonly<{ kind: "polygon"; vertices: readonly Coordinates[] }>;
export type GeoZone = "center" | "nearby" | "outskirts" | "remote" | "special_transport";
export const geoZoneLabels: Readonly<Record<GeoZone, string>> = { center: "Trung tâm quy ước", nearby: "Khu vực lân cận", outskirts: "Ngoại ô", remote: "Điểm xa", special_transport: "Cần trung chuyển riêng" };
export interface CityGeoConfig {
  readonly slug: string;
  readonly center: Coordinates;
  readonly core: GeoFence;
  readonly nearby_km: number;
  readonly outskirts_km: number;
  readonly provenance: "editorial_discovery_area_not_administrative_boundary";
}

export function pointInFence(point: Coordinates, fence: GeoFence): boolean {
  if (!validCoordinates(point)) throw new RangeError("Invalid geographic point");
  if (fence.kind === "bbox") {
    if (!validCoordinates({ lat: fence.south, lng: fence.west }) || !validCoordinates({ lat: fence.north, lng: fence.east }) || fence.south > fence.north) throw new RangeError("Invalid geographic box");
    return point.lat >= fence.south && point.lat <= fence.north && (fence.west <= fence.east ? point.lng >= fence.west && point.lng <= fence.east : point.lng >= fence.west || point.lng <= fence.east);
  }
  const vertices = fence.vertices;
  if (vertices.length < 3 || vertices.length > 128 || vertices.some(vertex => !validCoordinates(vertex)) || Math.max(...vertices.map(p => p.lng)) - Math.min(...vertices.map(p => p.lng)) > 180) throw new RangeError("Invalid or unsupported geographic polygon");
  const area = vertices.reduce((sum, a, index) => { const b = vertices[(index + 1) % vertices.length]; return sum + a.lng * b.lat - b.lng * a.lat; }, 0);
  if (Math.abs(area) < 1e-12) throw new RangeError("Degenerate geographic polygon");
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[j], b = vertices[i];
    const cross = (point.lng - a.lng) * (b.lat - a.lat) - (point.lat - a.lat) * (b.lng - a.lng);
    if (Math.abs(cross) < 1e-10 && point.lng >= Math.min(a.lng, b.lng) && point.lng <= Math.max(a.lng, b.lng) && point.lat >= Math.min(a.lat, b.lat) && point.lat <= Math.max(a.lat, b.lat)) return true;
    if ((a.lat > point.lat) !== (b.lat > point.lat) && point.lng < (b.lng - a.lng) * (point.lat - a.lat) / (b.lat - a.lat) + a.lng) inside = !inside;
  }
  return inside;
}

export function classifyGeo(point: Coordinates, config: CityGeoConfig, manualTransfer = false): Readonly<{ zone: GeoZone; distance_km: number; provenance: CityGeoConfig["provenance"] }> {
  if (!Number.isFinite(config.nearby_km) || !Number.isFinite(config.outskirts_km) || config.nearby_km <= 0 || config.outskirts_km <= config.nearby_km) throw new RangeError("Invalid geographic bands");
  const distance = haversineKm(config.center, point), core = pointInFence(point, config.core);
  return { zone: manualTransfer ? "special_transport" : core ? "center" : distance <= config.nearby_km ? "nearby" : distance <= config.outskirts_km ? "outskirts" : "remote", distance_km: distance, provenance: config.provenance };
}
