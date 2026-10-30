import { createHash } from "node:crypto";
import { requestSchema } from "@/lib/doc/cloud-plan-schema";
import { validatedSavedPlan } from "@/lib/doc/saved-plan";
import { parseServerEnv } from "@/lib/config/env.server";
import { createRequestLimiter } from "@/lib/api/request-limit.server";

export const runtime = "nodejs";
const limit = createRequestLimiter(30, 60_000);
const headers = { "Cache-Control": "no-store, private", "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff" };
const respond = (data: object, status = 200) => Response.json(data, { status, headers });
function authConfig(): { url: string; key: string } | null {
  // Separate feature gate: off until staging security / WAF checks pass.
  if (process.env.DOC_PLAN_CLOUD_ENABLED !== "true") return null;
  const env = parseServerEnv();
  if (!env.CLOUD_ENABLED || !env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  if (url.protocol !== "https:" && !(env.DEPLOYMENT_ENV === "local" && ["127.0.0.1","localhost"].includes(url.hostname))) return null;
  return { url: url.origin, key: env.SUPABASE_SERVICE_ROLE_KEY };
}
async function rest(config: {url:string;key:string}, path: string, method: "GET" | "POST" | "DELETE", body?: object): Promise<Response> {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 8_000);
  try {
    return await fetch(`${config.url}/rest/v1/${path}`, {
      method, headers: { apikey:config.key, Authorization:`Bearer ${config.key}`, "content-type":"application/json", Accept:"application/json", ...(method==="POST"?{Prefer:"return=minimal"}:{}) },
      ...(body ? { body:JSON.stringify(body) } : {}), cache:"no-store", redirect:"error", signal:ctrl.signal,
    });
  } finally { clearTimeout(timer); }
}
export async function POST(request: Request): Promise<Response> {
  try {
    limit();
    // All operations including reads use POST so bearer codes do not enter URL history or proxy query logs.
    const origin = request.headers.get("origin"), target = new URL(request.url);
    const host = request.headers.get("host");
    const expected = host && !/[\s,/@?#\\]/.test(host) ? `${target.protocol}//${host}` : target.origin;
    if (!origin || origin !== expected || request.headers.get("sec-fetch-site") === "cross-site") return respond({error:"Yêu cầu không cùng nguồn gốc."},403);
    if (request.headers.get("content-type")?.split(";")[0].trim()!=="application/json") return respond({error:"Chỉ chấp nhận JSON."},415);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 70_000) return respond({error:"Kế hoạch vượt quá giới hạn 70 KB."},413);
    const parsed = requestSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return respond({error:"Dữ liệu kế hoạch hoặc mã truy cập không hợp lệ."},422);
    const cloud = authConfig();
    if (!cloud) return respond({error:"Chưa cấu hình kho kế hoạch đám mây. Vẫn có thể lưu trên thiết bị và xuất file."},503);
    const input=parsed.data;
    const code = input.action === "publish" ? input.plan.code : input.code;
    const hash=createHash("sha256").update(code).digest("hex");
    if (input.action === "publish") {
      const plan=validatedSavedPlan(input.plan);
      // The server stores only the hashed capability, not the plaintext code.
      const {code: _secret, ...payload}=plan;
      void _secret;
      const response=await rest(cloud,"doc_plan_vault", "POST", {access_hash:hash,payload});
      if(response.status===409) return respond({ok:true,alreadyStored:true});
      if(!response.ok) return respond({error:"Máy chủ chưa lưu được kế hoạch. Kiểm tra migrations và Supabase."},503);
      return respond({ok:true,alreadyStored:false},201);
    }
    if(input.action === "remove") {
      const response=await rest(cloud,`doc_plan_vault?access_hash=eq.${hash}`,"DELETE");
      return response.ok ? respond({ok:true}) : respond({error:"Không xóa được bản đồng bộ."},503);
    }
    const response=await rest(cloud,`doc_plan_vault?access_hash=eq.${hash}&select=payload,expires_at&limit=1`,"GET");
    if(!response.ok) return respond({error:"Không thể truy cập kho kế hoạch lúc này."},503);
    const rows:unknown=await response.json();
    if(!Array.isArray(rows)||rows.length===0) return respond({error:"Không tìm thấy kế hoạch hoặc mã đã hết hạn."},404);
    const row=rows[0] as {payload?:unknown;expires_at?:unknown};
    if(typeof row.expires_at!=="string" || Date.parse(row.expires_at)<Date.now()) return respond({error:"Mã kế hoạch đã hết hạn."},404);
    const plan=validatedSavedPlan({...((row.payload && typeof row.payload==="object") ? row.payload : {}),code});
    return respond({plan});
  }catch {return respond({error:"Không thể xử lý kế hoạch. Kiểm tra kết nối và cấu hình máy chủ."},503);}
}
