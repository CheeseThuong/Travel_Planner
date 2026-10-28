import { assertMatrixInput, haversineKm } from "@/domain/routing/matrix";
import type { MatrixInput, MatrixResult, RoutingProvider } from "@/domain/ports/providers";

export class ApproximateRoutingProvider implements RoutingProvider {
  async estimateMatrix(input: MatrixInput, signal?: AbortSignal): Promise<MatrixResult> {
    signal?.throwIfAborted(); assertMatrixInput(input);
    const speed = { walk: 4, motorbike: 25, drive: 30 }[input.transport_mode];
    return { node_ids: input.nodes.map((node) => node.id), cells: input.nodes.map((from) => input.nodes.map((to) => ({ status: "reachable", duration_minutes: Math.ceil(haversineKm(from, to) * 1.3 / speed * 60), estimate_source: "approximate", uncertainty: "high" }))), warnings: ["APPROXIMATE_NOT_ROAD_ETA", "LAND_ACCESS_NOT_ESTABLISHED"], elements_requested: 0 };
  }
}
