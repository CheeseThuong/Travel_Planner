import type { Coordinates } from "../model/trip";
import type { MatrixInput, MatrixResult } from "../ports/providers";
import { validCoordinates } from "../trip-draft";

export function haversineKm(a: Coordinates, b: Coordinates): number {
  if (!validCoordinates(a) || !validCoordinates(b)) throw new RangeError("Invalid routing coordinates");
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const value = Math.sin(radians(b.lat - a.lat) / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(radians(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, value))));
}
export function assertMatrixInput(input: MatrixInput): void {
  if (input.nodes.length < 1 || input.nodes.length > 31 || !["walk", "motorbike", "drive"].includes(input.transport_mode) || new Set(input.nodes.map((node) => node.id)).size !== input.nodes.length || input.nodes.some((node) => !node.id || !validCoordinates(node))) throw new RangeError("Invalid or oversized routing input");
}
export function assertMatrix(input: MatrixInput, matrix: MatrixResult): void {
  assertMatrixInput(input);
  const size = input.nodes.length;
  if (matrix.node_ids.length !== size || matrix.node_ids.some((id, index) => id !== input.nodes[index].id) || matrix.cells.length !== size || matrix.cells.some((row) => row.length !== size) || (matrix.elements_requested !== null && (!Number.isSafeInteger(matrix.elements_requested) || matrix.elements_requested < 0 || matrix.elements_requested > size * size))) throw new RangeError("Invalid directed matrix identity, shape or usage");
  for (const row of matrix.cells) for (const cell of row) {
    if (cell.status === "unreachable") continue;
    if (cell.status !== "reachable" || !Number.isSafeInteger(cell.duration_minutes) || cell.duration_minutes < 0 || !["approximate", "google_routes"].includes(cell.estimate_source) || !["low", "high"].includes(cell.uncertainty)) throw new RangeError("Invalid directed matrix cell");
  }
}
