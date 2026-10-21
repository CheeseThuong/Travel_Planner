import { z } from "zod";

const flag = z.enum(["true", "false"]).default("false").transform((value) => value === "true");
const optionalText = z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional());
const schema = z.object({
  DEPLOYMENT_ENV: z.enum(["local", "staging", "production"]).default("local"),
  CLOUD_ENABLED: flag,
  NEXT_PUBLIC_SUPABASE_URL: optionalText,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalText,
  SUPABASE_SERVICE_ROLE_KEY: optionalText,
  GOOGLE_MAPS_LIVE_ENABLED: flag,
  GOOGLE_MAPS_SERVER_KEY: optionalText,
  GOOGLE_MAPS_DAILY_BUDGET_MINOR: z.coerce.number().int().min(0).max(1000000).default(0),
}).superRefine((env, context) => {
  const issue = (path: string, message: string) => context.addIssue({ code: "custom", path: [path], message });
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (Boolean(url) !== Boolean(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) issue("CLOUD_ENABLED", "Incomplete cloud configuration");
  if (url) {
    try {
      const parsed = new URL(url);
      const local = ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) && env.DEPLOYMENT_ENV === "local";
      if (parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:"))) issue("NEXT_PUBLIC_SUPABASE_URL", "Unsafe cloud URL");
    } catch { issue("NEXT_PUBLIC_SUPABASE_URL", "Invalid cloud URL"); }
  }
  if (env.CLOUD_ENABLED && !url) issue("CLOUD_ENABLED", "Cloud credentials required");
  if (env.DEPLOYMENT_ENV === "production" && !env.CLOUD_ENABLED) issue("CLOUD_ENABLED", "Production requires configured cloud");
  if (env.GOOGLE_MAPS_LIVE_ENABLED && (!env.GOOGLE_MAPS_SERVER_KEY || env.GOOGLE_MAPS_DAILY_BUDGET_MINOR <= 0)) issue("GOOGLE_MAPS_LIVE_ENABLED", "Live provider requires credentials and budget");
});

export function parseServerEnv(raw: Record<string, unknown> = process.env) {
  const result = schema.safeParse(raw);
  if (!result.success) throw new Error(`Invalid server configuration: ${[...new Set(result.error.issues.map((issue) => issue.path[0]))].join(", ")}`);
  return result.data;
}
