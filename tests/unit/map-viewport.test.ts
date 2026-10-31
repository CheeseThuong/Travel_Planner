import { expect, test } from "vitest";
import { MERCATOR_LATITUDE, mapPixel, moveMap, projectMap, unprojectMap, visibleMapTiles } from "@/domain/discovery/map-viewport";

test.each([0, 8, 14, 18, 19])("world projection roundtrips Vietnam and wraps longitude, zoom%s", zoom => {
  for (const point of [{ lat: 12.2451, lng: 109.1943 }, { lat: 11.9404, lng: 108.4583 }, { lat: -80, lng: -179.9 }]) {
    const result = unprojectMap(projectMap(point, zoom), zoom);
    expect(result.lat).toBeCloseTo(point.lat, 8); expect(result.lng).toBeCloseTo(point.lng, 8);
  }
  expect(unprojectMap(projectMap({ lat: 90, lng: 180 }, zoom), zoom)).toMatchObject({ lng: -180 });
  expect(unprojectMap(projectMap({ lat: 90, lng: 0 }, zoom), zoom).lat).toBeCloseTo(MERCATOR_LATITUDE, 8);
});
test("independent documented Hachiko fixture uses expected tile numbers", () => {
  const point = projectMap({ lat: 35.6590699, lng: 139.7006793 }, 18);
  expect(Math.floor(point.x / 256)).toBe(232798); expect(Math.floor(point.y / 256)).toBe(103246);
});
test.each([0, 10, 18, 19])("only visible bounded tiles, valid wrapped coordinates and no prefetch, zoom%s", zoom => {
  for (const center of [{ lat: 12, lng: 109 }, { lat: 85, lng: 179.999 }, { lat: -85, lng: -179.999 }]) {
    const tiles = visibleMapTiles(center, zoom, 512, 320);
    expect(tiles.length).toBeLessThanOrEqual(9);
    expect(tiles.every(tile => tile.x >= 0 && tile.x < 2 ** zoom && tile.y >= 0 && tile.y < 2 ** zoom && tile.left < 512 && tile.left + 256 > 0 && tile.top < 320 && tile.top + 256 > 0)).toBe(true);
    expect(new Set(tiles.map(tile => tile.key)).size).toBe(tiles.length);
  }
  expect(visibleMapTiles({ lat: 12, lng: 109 }, zoom, 0, 320)).toEqual([]);
});
test("pan, pin pixels, invalid zoom/coordinates/viewport are explicit", () => {
  const center = { lat: 12, lng: 109 }, moved = moveMap(center, 14, 64, 0);
  expect(moved.lng).toBeGreaterThan(center.lng); expect(moved.lat).toBeCloseTo(center.lat);
  expect(mapPixel(center, center, 14, 400, 320)).toEqual({ x: 200, y: 160 });
  expect(() => projectMap({ lat: NaN, lng: 0 }, 14)).toThrow();
  expect(() => projectMap(center, 20)).toThrow();
  expect(() => visibleMapTiles(center, 14, 513, 320)).toThrow();
  expect(() => unprojectMap({ x: Infinity, y: 0 }, 14)).toThrow();
});
