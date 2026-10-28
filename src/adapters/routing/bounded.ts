import { assertMatrix, assertMatrixInput } from "@/domain/routing/matrix";
import type { MatrixInput, MatrixResult, RoutingProvider } from "@/domain/ports/providers";
import { ApproximateRoutingProvider } from "./approximate";

export class BoundedRoutingProvider implements RoutingProvider {
  constructor(private readonly primary?: RoutingProvider, private readonly timeoutMs = 1500) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000) throw new RangeError("Invalid routing deadline");
  }
  async estimateMatrix(input: MatrixInput, signal?: AbortSignal): Promise<MatrixResult> {
    signal?.throwIfAborted(); assertMatrixInput(input);
    const fallback = new ApproximateRoutingProvider();
    if (!this.primary) return fallback.estimateMatrix(input, signal);
    const deadline = new AbortController();
    const combined = signal ? AbortSignal.any([signal, deadline.signal]) : deadline.signal;
    const timer = setTimeout(() => deadline.abort(), this.timeoutMs);
    let rejectAbort: (() => void) | undefined;
    try {
      const aborted = new Promise<never>((_, reject) => { rejectAbort = () => reject(new DOMException("Routing cancelled or timed out", "AbortError")); combined.addEventListener("abort", rejectAbort, { once: true }); });
      const result = await Promise.race([this.primary.estimateMatrix(input, combined), aborted]);
      signal?.throwIfAborted(); assertMatrix(input, result);
      return structuredClone(result);
    } catch {
      signal?.throwIfAborted();
      const result = await fallback.estimateMatrix(input, signal);
      return { ...result, elements_requested: null, warnings: [...result.warnings, "PROVIDER_UNAVAILABLE", "PROVIDER_USAGE_UNKNOWN"] };
    } finally { clearTimeout(timer); if (rejectAbort) combined.removeEventListener("abort", rejectAbort); }
  }
}
