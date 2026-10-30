import { z } from "zod";
import { communityPlaces, ContributionAccessError, createContributionSession, verifiedContributions, type ContributionConfig, type ContributionMutation } from "@/adapters/supabase/contributions.server";
import { contributionSchema } from "@/lib/validation/contribution";
import { parseServerEnv } from "@/lib/config/env.server";
import { ApiError, readJson, success, withApi } from "./http.server";
import { createRequestLimiter } from "./request-limit.server";

export const contributionTransitionSchema = z.strictObject({ expected_version: z.number().int().min(1).max(2147483645), action: z.enum(["verify", "approve", "reject", "restore", "withdraw"]), note: z.string().trim().max(1000).refine(value => !/[\u0000-\u001f\u007f]/.test(value)).default("") });
const querySchema = z.strictObject({ destination_slug: z.enum(["nha-trang", "da-lat"]), scope: z.enum(["mine", "review"]).default("mine"), offset: z.coerce.number().int().min(0).max(1000).default(0) });
const publicSchema = z.strictObject({ destination_slug: z.enum(["nha-trang", "da-lat"]), offset: z.coerce.number().int().min(0).max(1000).default(0) });
const cookieName = "travel_contributor";
function config(): ContributionConfig {
  const env = parseServerEnv();
  if (!env.CLOUD_ENABLED || !env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) throw new ApiError(503, "PROVIDER_UNAVAILABLE", "Đóng góp chưa được cấu hình. Nội dung bạn nhập vẫn được giữ.");
  return { url: env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY };
}
function token(request: Request): string | null {
  const bearer = /^Bearer ([^\s;]{1,8192})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  const cookie = request.headers.get("cookie")?.split(";").map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  return bearer ?? (cookie && /^[^\s;]{1,8192}$/.test(cookie) ? cookie : null);
}
function sameOrigin(request: Request) {
  const url = new URL(request.url), host = request.headers.get("host");
  let expectedOrigin = url.origin;
  // Next may construct request.url with localhost while the browser uses 127.0.0.1.
  // Host is the actual HTTP authority; forwarded-host headers are never accepted.
  if (host) {
    try { if (/[\s,/@?#\\]/.test(host)) throw new Error(); expectedOrigin = new URL(`${url.protocol}//${host}`).origin; }
    catch { throw new ApiError(403, "FORBIDDEN", "Địa chỉ gửi yêu cầu không hợp lệ."); }
  }
  if (request.headers.get("origin") !== expectedOrigin || request.headers.get("sec-fetch-site") === "cross-site") throw new ApiError(403, "FORBIDDEN", "Thao tác cần được gửi từ trang hiện tại.");
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new ApiError(400, "VALIDATION_ERROR", "Cần nội dung JSON.");
}
function query<T>(request: Request, schema: z.ZodType<T>): T {
  const params = [...new URL(request.url).searchParams];
  if (new Set(params.map(([key]) => key)).size !== params.length) throw new ApiError(422, "VALIDATION_ERROR", "Tham số bị lặp.");
  const parsed = schema.safeParse(Object.fromEntries(params));
  if (!parsed.success) throw new ApiError(422, "VALIDATION_ERROR", "Thông tin truy vấn chưa hợp lệ.");
  return parsed.data;
}
async function owner(request: Request) {
  const access = token(request);
  if (!access) throw new ApiError(401, "AUTH_REQUIRED", "Cần phiên đóng góp hợp lệ.");
  return verifiedContributions(config(), access);
}
function result(value: ContributionMutation): ContributionMutation {
  if (value.status === "not_found") throw new ApiError(404, "NOT_FOUND", "Không tìm thấy đóng góp.");
  if (value.status === "rate_limited") throw new ApiError(429, "RATE_LIMITED", "Đã đạt giới hạn đóng góp. Hãy thử lại sau hoặc rút bớt mục đang hoạt động.");
  if (value.status === "transition_denied") throw new ApiError(403, "FORBIDDEN", "Trạng thái hoặc quyền hiện tại không cho phép thao tác; duyệt/từ chối cần ghi chú ít nhất 10 ký tự.");
  if (value.status === "version_conflict" || value.status === "idempotency_conflict") throw new ApiError(409, "VERSION_CONFLICT", "Dữ liệu hoặc mã thao tác đã thay đổi. Tải lại danh sách trước khi thử tiếp.", value.status === "version_conflict" ? { current_version: value.current_version } : {});
  return value;
}
export function createContributionHandlers() {
  const limit = createRequestLimiter(100, 60_000), sessionLimit = createRequestLimiter(10, 60_000);
  function handle(request: Request, operation: (id: string) => Promise<Response>) {
    return withApi(request, async id => {
      try { limit(); return await operation(id); }
      catch (error) {
        if (error instanceof ContributionAccessError) {
          const status = { unauthorized: 401, forbidden: 403, invalid_input: 422, rate_limited: 429, unavailable: 503 }[error.code];
          const code = { unauthorized: "AUTH_REQUIRED", forbidden: "FORBIDDEN", invalid_input: "VALIDATION_ERROR", rate_limited: "RATE_LIMITED", unavailable: "PROVIDER_UNAVAILABLE" } as const;
          throw new ApiError(status, code[error.code], "Không thể xác nhận hoặc xử lý đóng góp lúc này. Nội dung đã nhập vẫn được giữ.");
        }
        throw error;
      }
    });
  }
  return {
    session: (request: Request) => handle(request, async id => {
      const current = await owner(request); return success({ moderator: current.moderator }, id);
    }),
    startSession: (request: Request) => handle(request, async id => {
      sameOrigin(request); await readJson(request, z.strictObject({}), 128); sessionLimit();
      const settings = config(); let access = token(request);
      if (access) {
        try { const current = await verifiedContributions(settings, access); return success({ moderator: current.moderator }, id); }
        catch (error) { if (!(error instanceof ContributionAccessError) || error.code !== "unauthorized") throw error; }
      }
      access = await createContributionSession(settings);
      const current = await verifiedContributions(settings, access), response = success({ moderator: current.moderator }, id);
      response.headers.set("set-cookie", `${cookieName}=${access}; Path=/api/v1/contributions; HttpOnly; SameSite=Strict${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`);
      return response;
    }),
    list: (request: Request) => handle(request, async id => { const input = query(request, querySchema), current = await owner(request); return success({ items: await current.list(input.destination_slug, input.scope === "review", input.offset) }, id); }),
    submit: (request: Request) => handle(request, async id => {
      sameOrigin(request);
      const key = z.uuid().safeParse(request.headers.get("idempotency-key"));
      if (!key.success) throw new ApiError(422, "VALIDATION_ERROR", "Cần mã thao tác hợp lệ.");
      const input = await readJson(request, contributionSchema, 8192), current = await owner(request);
      return success(result(await current.submit(input, key.data)), id, 201);
    }),
    transition: (request: Request, context: { params: Promise<{ submissionId: string }> }) => handle(request, async id => {
      sameOrigin(request); const submission = z.uuid().safeParse((await context.params).submissionId);
      if (!submission.success) throw new ApiError(422, "VALIDATION_ERROR", "Cần mã đóng góp hợp lệ.");
      const input = await readJson(request, contributionTransitionSchema, 4096), current = await owner(request);
      return success(result(await current.transition(submission.data, input.expected_version, input.action, input.note)), id);
    }),
    publicList: (request: Request) => handle(request, async id => { const input = query(request, publicSchema); return success({ items: await communityPlaces(config(), input.destination_slug, input.offset) }, id); }),
  };
}
