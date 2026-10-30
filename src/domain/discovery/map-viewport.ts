import type { Coordinates } from "../model/trip";
import { validCoordinates } from "../trip-draft";

export const MERCATOR_LATITUDE = 85.0511287798066;
export interface WorldPoint { readonly x: number; readonly y: number }
function worldSize(zoom: number): number {
  if (!Number.isInteger(zoom) || zoom < 0 || zoom > 19) throw new RangeError("Invalid map zoom");
  return 256 * 2 ** zoom;
}
export function projectMap(point: Coordinates, zoom: number): WorldPoint {
  if (!validCoordinates(point)) throw new RangeError("Invalid map coordinates");
  const size = worldSize(zoom), latitude = Math.max(-MERCATOR_LATITUDE, Math.min(MERCATOR_LATITUDE, point.lat)) * Math.PI / 180;
  return { x: (point.lng + 180) / 360 * size, y: Math.max(0, Math.min(size, (1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2 * size)) };
}
export function unprojectMap(point: WorldPoint, zoom: number): Coordinates {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new RangeError("Invalid map pixels");
  const size = worldSize(zoom), x = ((point.x % size) + size) % size, y = Math.max(0, Math.min(size, point.y));
  return { lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / size))) * 180 / Math.PI, lng: x / size * 360 - 180 };
}
export function moveMap(point: Coordinates, zoom: number, dx: number, dy: number): Coordinates {
  const world = projectMap(point, zoom);
  return unprojectMap({ x: world.x + dx, y: world.y + dy }, zoom);
}
export function mapPixel(point: Coordinates, center: Coordinates, zoom: number, width: number, height: number): WorldPoint {
  const pin = projectMap(point, zoom), origin = projectMap(center, zoom), size = worldSize(zoom);
  const delta = ((pin.x - origin.x + size * 1.5) % size) - size / 2;
  return { x: width / 2 + delta, y: height / 2 + pin.y - origin.y };
}
export function visibleMapTiles(center: Coordinates, zoom: number, width: number, height: number) {
  if (![width, height].every(value => Number.isFinite(value) && value >= 0 && value <= 512)) throw new RangeError("Invalid bounded map viewport");
  const origin = projectMap(center, zoom), count = 2 ** zoom;
  const tiles: { key: string; x: number; y: number; left: number; top: number }[] = [];
  if (!width || !height) return tiles;
  const left = origin.x - width / 2, top = origin.y - height / 2;
  for (let y = Math.floor(top / 256); y <= Math.floor((top + height - 0.001) / 256); y++) {
    if (y < 0 || y >= count) continue;
    for (let rawX = Math.floor(left / 256); rawX <= Math.floor((left + width - 0.001) / 256); rawX++) {
      const x = ((rawX % count) + count) % count;
      tiles.push({ key: `${zoom}/${rawX}/${y}`, x, y, left: rawX * 256 - left, top: y * 256 - top });
    }
  }
  return tiles;
}
