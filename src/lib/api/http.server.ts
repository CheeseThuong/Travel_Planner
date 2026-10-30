import { z } from "zod";
import { logEvent } from "../telemetry/events.server";

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: "VALIDATION_ERROR" | "AUTH_REQUIRED" | "FORBIDDEN" | "NOT_FOUND" | "VERSION_CONFLICT" | "RATE_LIMITED" | "INTERNAL_ERROR" | "UNSUPPORTED_URL" | "UNSAFE_REDIRECT" | "PLAN_RUN_STALE" | "PLANNING_INFEASIBLE" | "PROVIDER_UNAVAILABLE", message: string, readonly details: Readonly<Record<string, unknown>> = {}) { super(message); }
}
export function requestId(request: Request): string {
  const raw = request.headers.get("x-request-id");
  return raw?.length === 36 && z.uuid().safeParse(raw).success ? raw : crypto.randomUUID();
}
export function success<T>(data: T, id: string, status = 200): Response {
  return Response.json({ data, meta: { request_id: id } }, { status, headers: { "x-request-id": id, "cache-control": "no-store" } });
}
export async function withApi(request: Request, operation: (id: string) => Promise<Response> | Response): Promise<Response> {
  const id = requestId(request);
  try { return await operation(id); }
  catch (error: unknown) {
    const safe = error instanceof ApiError ? error : new ApiError(500, "INTERNAL_ERROR", "Không thể xử lý yêu cầu lúc này.");
    logEvent({ event: "api_error", request_id: id, status: safe.status, code: safe.code });
    return Response.json({ error: { code: safe.code, message: safe.message, details: safe.details }, meta: { request_id: id } }, { status: safe.status, headers: { "x-request-id": id, "cache-control": "no-store" } });
  }
}
export async function readJson<T>(request: Request, schema: z.ZodType<T>, limit = 65536): Promise<T> {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "VALIDATION_ERROR", "Cần nội dung JSON.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) { await reader.cancel(); throw new ApiError(413, "VALIDATION_ERROR", "Nội dung yêu cầu quá lớn."); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new ApiError(400, "VALIDATION_ERROR", "Nội dung JSON không hợp lệ."); }
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(422, "VALIDATION_ERROR", "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.");
  return result.data;
}
