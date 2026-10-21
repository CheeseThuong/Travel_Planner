import type { MatrixInput, MatrixResult, RoutingProvider } from "@/domain/ports/providers";

/** Explicit test-only fixture adapter. It never represents a live Google result. */
export class FixtureRoutingProvider implements RoutingProvider {
  constructor(private readonly fixture: MatrixResult) {}
  async estimateMatrix(input: MatrixInput, signal?: AbortSignal): Promise<MatrixResult> {
    signal?.throwIfAborted();
    if (JSON.stringify(input.nodes.map(({ id }) => id)) !== JSON.stringify(this.fixture.node_ids)) throw new Error("Fixture node identity mismatch");
    return structuredClone(this.fixture);
  }
}
