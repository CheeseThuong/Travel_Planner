import { z } from "zod";

const eventSchema = z.object({
  event: z.enum(["api_error", "api_complete"]),
  request_id: z.uuid(),
  code: z.enum(["VALIDATION_ERROR", "AUTH_REQUIRED", "FORBIDDEN", "NOT_FOUND", "VERSION_CONFLICT", "RATE_LIMITED", "INTERNAL_ERROR", "UNSUPPORTED_URL", "UNSAFE_REDIRECT", "PLAN_RUN_STALE", "PLANNING_INFEASIBLE", "PROVIDER_UNAVAILABLE"]).optional(),
  status: z.number().int().min(100).max(599),
  duration_ms: z.number().nonnegative().max(120000).optional(),
});

/** Allowlist both field names and values; arbitrary payload/URL strings are never logged. */
export function logEvent(event: unknown, sink: (line: string) => void = console.info): void {
  const parsed = eventSchema.safeParse(event);
  if (parsed.success) sink(JSON.stringify(parsed.data));
}
