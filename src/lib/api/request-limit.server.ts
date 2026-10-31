import { ApiError } from "./http.server";

/** Instance-local only; distributed deployment protection is a separate G8 requirement. */
export function createRequestLimiter(maximum: number, windowMs: number, now: () => number = () => performance.now()): () => void {
  let start = now(), count = 0;
  return () => {
    const current = now();
    if (current - start >= windowMs) { start = current; count = 0; }
    if (count >= maximum) throw new ApiError(429, "RATE_LIMITED", "Vui lòng thử lại sau.");
    count++;
  };
}
