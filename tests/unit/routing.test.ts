import { expect, test } from "vitest";
import { assertMatrix, assertMatrixInput, haversineKm } from "@/domain/routing/matrix";
import { ApproximateRoutingProvider } from "@/adapters/routing/approximate";
import { BoundedRoutingProvider } from "@/adapters/routing/bounded";
import type { MatrixInput, MatrixResult } from "@/domain/ports/providers";

const input: MatrixInput = { transport_mode: "drive", nodes: [{ id: "a", lat: 12, lng: 109 }, { id: "b", lat: 12.1, lng: 109.1 }] };
const matrix: MatrixResult = { node_ids: ["a", "b"], cells: [[{ status: "reachable", duration_minutes: 0, estimate_source: "google_routes", uncertainty: "low" }, { status: "reachable", duration_minutes: 12, estimate_source: "google_routes", uncertainty: "low" }], [{ status: "unreachable" }, { status: "reachable", duration_minutes: 0, estimate_source: "google_routes", uncertainty: "low" }]], warnings: [], elements_requested: 4 };
test("strict matrix validation keeps directed and unreachable edges intact", () => {
  const before = structuredClone(matrix);
  expect(() => assertMatrix(input, matrix)).not.toThrow();
  expect(matrix).toEqual(before);
  for (const invalid of [{ ...matrix, node_ids: ["b", "a"] }, { ...matrix, cells: [] }, { ...matrix, elements_requested: 5 }, { ...matrix, cells: [[{ status: "reachable", duration_minutes: NaN, estimate_source: "google_routes", uncertainty: "low" }, matrix.cells[0][1]], matrix.cells[1]] }]) expect(() => assertMatrix(input, invalid as MatrixResult)).toThrow();
});
test("no-key approximate routing is deterministic, clearly uncertain and safe at equal coordinates", async () => {
  const provider = new ApproximateRoutingProvider();
  const result = await provider.estimateMatrix(input);
  expect(await provider.estimateMatrix(input)).toEqual(result);
  expect(result.elements_requested).toBe(0);
  expect(result.warnings).toContain("APPROXIMATE_NOT_ROAD_ETA");
  expect(result.cells[0][1]).toMatchObject({ status: "reachable", estimate_source: "approximate", uncertainty: "high" });
  expect(haversineKm(input.nodes[0], input.nodes[0])).toBe(0);
  const equal = await provider.estimateMatrix({ ...input, nodes: input.nodes.map((node) => ({ ...node, lat: 12, lng: 109 })) });
  expect(equal.cells[0][1]).toMatchObject({ duration_minutes: 0 });
});
test("bounds reject coordinates, duplicate identities and too many nodes before primary invocation", async () => {
  for (const invalid of [{ ...input, nodes: [{ ...input.nodes[0], lat: 91 }] }, { ...input, nodes: [input.nodes[0], input.nodes[0]] }, { ...input, nodes: Array.from({ length: 32 }, (_, index) => ({ ...input.nodes[0], id: String(index) })) }]) expect(() => assertMatrixInput(invalid)).toThrow();
  let calls = 0;
  const provider = new BoundedRoutingProvider({ estimateMatrix: async () => { calls++; return matrix; } });
  await expect(provider.estimateMatrix({ ...input, nodes: [] })).rejects.toThrow();
  expect(calls).toBe(0);
});
test("one primary call preserves directed cells;429/invalid/timeout fall back with unknown usage", async () => {
  expect(await new BoundedRoutingProvider({ estimateMatrix: async () => matrix }).estimateMatrix(input)).toEqual(matrix);
  for (const primary of [async () => { throw new Error("429 private provider payload"); }, async () => ({ ...matrix, node_ids: [] }), () => new Promise<MatrixResult>(() => {})]) {
    const result = await new BoundedRoutingProvider({ estimateMatrix: primary }, 5).estimateMatrix(input);
    expect(result.warnings).toContain("PROVIDER_USAGE_UNKNOWN");
    expect(result.elements_requested).toBeNull();
    expect(JSON.stringify(result)).not.toContain("private");
    expect(result.cells[1][0]).toMatchObject({ estimate_source: "approximate" });
  }
});
test("caller abort propagates even when a primary ignores cancellation", async () => {
  const controller = new AbortController();
  const provider = new BoundedRoutingProvider({ estimateMatrix: () => new Promise(() => {}) }, 1000);
  const pending = provider.estimateMatrix(input, controller.signal);
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
});
