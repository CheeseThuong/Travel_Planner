import { z } from "zod";
import { createVerifiedOwnerDraftRepository, OwnerAccessError } from "@/adapters/supabase/owner-drafts.server";
import { ApproximateRoutingProvider } from "@/adapters/routing/approximate";
import { generatePlan } from "@/domain/planning/engine";
import { routingInputForDraft } from "@/domain/routing/matrix";
import type { PlanWriteResult } from "@/domain/ports/persistence";
import { parseServerEnv } from "@/lib/config/env.server";
import { ApiError, readJson, success, withApi } from "./http.server";
import { createRequestLimiter } from "./request-limit.server";

const version = z.number().int().min(1).max(2147483646);
const generateSchema = z.strictObject({ expected_version: version, engine_version: z.literal("planner-v1").default("planner-v1"), routing_quality: z.enum(["auto", "approximate"]).default("auto"), preserve_locked_stops: z.literal(true).default(true), seed: z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER).default(42) });
const applySchema = z.strictObject({ expected_version: version, plan_run_id: z.uuid(), confirmed: z.literal(true) });
const limit = createRequestLimiter(20, 60_000);
export type PlanningRouteContext = { params: Promise<{ tripId: string }> };

function uuid(value: unknown): string {
  const result = z.uuid().safeParse(value);
  if (!result.success) throw new ApiError(422, "VALIDATION_ERROR", "Cần mã định danh hợp lệ.");
  return result.data;
}
async function repository(request: Request) {
  const bearer = /^Bearer ([^\s]{1,8192})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!bearer) throw new ApiError(401, "AUTH_REQUIRED", "Cần phiên chủ sở hữu hợp lệ.");
  const env = parseServerEnv();
  if (!env.CLOUD_ENABLED || !env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) throw new ApiError(503, "PROVIDER_UNAVAILABLE", "Lưu trữ chưa được cấu hình. Thông tin cục bộ vẫn được giữ.");
  return createVerifiedOwnerDraftRepository({ url: env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }, bearer);
}
function writeFailure(result: PlanWriteResult): never {
  if (result.status === "not_found") throw new ApiError(404, "NOT_FOUND", "Không tìm thấy chuyến đi hoặc ứng viên.");
  if (result.status === "idempotency_conflict") throw new ApiError(409, "VERSION_CONFLICT", "Mã thao tác đã được dùng cho yêu cầu khác.");
  throw new ApiError(409, result.status === "plan_run_stale" ? "PLAN_RUN_STALE" : "VERSION_CONFLICT", "Dữ liệu đã thay đổi. Hãy tạo ứng viên mới.", { current_version: result.current_version });
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
function planningApi(request: Request, operation: (id: string) => Promise<Response>): Promise<Response> {
  return withApi(request, async (id) => {
    try { limit(); return await operation(id); }
    catch (error) {
      if (error instanceof OwnerAccessError) throw new ApiError(error.code === "unauthorized" ? 401 : error.code === "invalid_input" ? 422 : 503, error.code === "unauthorized" ? "AUTH_REQUIRED" : error.code === "invalid_input" ? "VALIDATION_ERROR" : "PROVIDER_UNAVAILABLE", "Không thể xác nhận hoặc lưu thao tác lúc này.");
      if (error instanceof RangeError) throw new ApiError(422, "VALIDATION_ERROR", "Đầu vào lịch trình chưa hợp lệ.");
      throw error;
    }
  });
}

export function generate(request: Request, context: PlanningRouteContext): Promise<Response> {
  return planningApi(request, async (id) => {
    const tripId = uuid((await context.params).tripId), key = uuid(request.headers.get("idempotency-key"));
    const input = await readJson(request, generateSchema, 8192), owner = await repository(request), draft = await owner.load(tripId);
    if (!draft) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy chuyến đi.");
    if (draft.version !== input.expected_version) throw new ApiError(409, "VERSION_CONFLICT", "Phiên bản đã thay đổi.", { current_version: draft.version });
    const matrix = await new ApproximateRoutingProvider().estimateMatrix(routingInputForDraft(draft), request.signal);
    const result = generatePlan(draft, matrix, { clock: { now: () => new Date() }, seed: input.seed, plan_run_id: crypto.randomUUID() });
    if (result.status === "conflict") throw new ApiError(422, "PLANNING_INFEASIBLE", "Có xung đột điểm đã khóa.", { conflicts: result.conflicts, unscheduled: result.unscheduled });
    const stored = await owner.storeCandidate(tripId, input.expected_version, key, result.candidate);
    if (stored.status !== "candidate") writeFailure(stored);
    return success(stored.candidate, id);
  });
}
export function apply(request: Request, context: PlanningRouteContext): Promise<Response> {
  return planningApi(request, async (id) => {
    const tripId = uuid((await context.params).tripId), key = uuid(request.headers.get("idempotency-key"));
    const input = await readJson(request, applySchema, 8192), owner = await repository(request), draft = await owner.load(tripId);
    if (!draft) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy chuyến đi.");
    const stored = await owner.loadCandidate(tripId, input.plan_run_id);
    if (!stored) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy ứng viên.");
    if (stored.input_version === draft.version) {
      if (input.expected_version !== draft.version) throw new ApiError(409, "VERSION_CONFLICT", "Phiên bản đã thay đổi.", { current_version: draft.version });
      const matrix = await new ApproximateRoutingProvider().estimateMatrix(routingInputForDraft(draft), request.signal);
      const verified = generatePlan(draft, matrix, { clock: { now: () => new Date() }, seed: stored.seed, plan_run_id: stored.plan_run_id });
      if (verified.status !== "candidate" || canonical(verified.candidate) !== canonical(stored)) throw new ApiError(409, "PLAN_RUN_STALE", "Ứng viên không còn khớp đầu vào. Hãy tạo lại.");
    }
    // A stale run can only replay a previous exact idempotency key; SQL otherwise rejects it.
    const applied = await owner.applyCandidate(tripId, input.plan_run_id, input.expected_version, key);
    if (applied.status !== "applied") writeFailure(applied);
    return success(applied, id);
  });
}
