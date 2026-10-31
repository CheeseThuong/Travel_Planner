import { ApiError, success, withApi } from "@/lib/api/http.server";
import { parseServerEnv } from "@/lib/config/env.server";

/** Capability snapshot; never emits credentials or connection details. */
export async function GET(request: Request) {
  return withApi(request, id => {
    let env;
    try { env = parseServerEnv(); }
    catch { throw new ApiError(503, "PROVIDER_UNAVAILABLE", "Cấu hình máy chủ không hợp lệ."); }
    const cloudConfigured = Boolean(env.CLOUD_ENABLED && env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    return success({ contributions: cloudConfigured ? "configured_not_verified" : "disabled",
      privatePlanCloud: cloudConfigured && process.env.DOC_PLAN_CLOUD_ENABLED === "true" ? "configured_not_verified" : "disabled",
      note: "Cấu hình không chứng minh Supabase Auth, RPC và RLS đã hoạt động. Cần kiểm tra kết nối thực tế." }, id);
  });
}
