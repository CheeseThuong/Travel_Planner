import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { findDestination } from "@/domain/model/destination";

test("destination metadata rejects unknown cities and keeps distinct supported cities", () => {
  expect(findDestination("unknown")).toBeUndefined();
  expect(findDestination("nha-trang")?.theme).toBe("ocean");
  expect(findDestination("da-lat")?.theme).toBe("forest");
});

test("deterministic synthetic fixture identities and directed matrix do not mix cities", () => {
  type PlaceFixture = { kind: string; places: { id: string; destination_slug: string }[] };
  type MatrixFixture = { minutes: number[][] };
  const load = <T>(name: string): T => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8")) as T;
  const beach = load<PlaceFixture>("nha-trang-10-places"), forest = load<PlaceFixture>("da-lat-places"), matrix = load<MatrixFixture>("routing-10x10");
  expect(beach.kind).toBe("synthetic_test_fixture"); expect(forest.kind).toBe("synthetic_test_fixture");
  expect(beach.places).toHaveLength(10);
  const all = [...beach.places, ...forest.places]; expect(new Set(all.map((place) => place.id)).size).toBe(all.length);
  expect(beach.places.every((place) => place.destination_slug === "nha-trang")).toBe(true);
  expect(forest.places.every((place) => place.destination_slug === "da-lat")).toBe(true);
  expect(matrix.minutes).toHaveLength(10); expect(matrix.minutes.every((row) => row.length === 10)).toBe(true);
  expect(matrix.minutes[0][1]).not.toBe(matrix.minutes[1][0]);
  expect(JSON.stringify(load("routing-10x10"))).toBe(JSON.stringify(matrix));
});
