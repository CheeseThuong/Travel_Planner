import { z } from "zod";
import { reviewedGroqModels } from "./groq-models.server";

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
  BRAVE_ENABLED: flag,
  BRAVE_API_KEY: optionalText,
  BRAVE_DAILY_REQUEST_LIMIT: z.coerce.number().int().min(0).max(10000).default(0),
  BRAVE_MINUTE_REQUEST_LIMIT: z.coerce.number().int().min(1).max(60).default(10),
  GROQ_ENABLED: flag,
  GROQ_API_KEY: optionalText,
  GROQ_MODEL: z.preprocess(value => value === "" ? undefined : value, z.enum(reviewedGroqModels).optional()),
  GROQ_COST_CONTROLS_APPROVED: flag,
  GROQ_ZDR_CONFIRMED: flag,
  GROQ_DAILY_REQUEST_LIMIT: z.coerce.number().int().min(0).max(10000).default(0),
  GROQ_MINUTE_REQUEST_LIMIT: z.coerce.number().int().min(1).max(60).default(5),
  GROQ_DAILY_TOKEN_LIMIT: z.coerce.number().int().min(0).max(10_000_000).default(0),
  GROQ_DAILY_BUDGET_MICRO_USD: z.coerce.number().int().min(0).max(100_000_000).default(0),
  GROQ_INPUT_USD_PER_MILLION: z.coerce.number().min(0).max(1000).default(0),
  GROQ_OUTPUT_USD_PER_MILLION: z.coerce.number().min(0).max(1000).default(0),
  GROQ_MAX_COMPLETION_TOKENS: z.coerce.number().int().min(128).max(4096).default(2048),
  GROQ_TIMEOUT_MS: z.coerce.number().int().min(1).max(10_000).default(4000),
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
  if (env.BRAVE_ENABLED && (!env.BRAVE_API_KEY || env.BRAVE_DAILY_REQUEST_LIMIT < 1)) issue("BRAVE_ENABLED", "Brave requires credentials and bounded quota");
  if (env.GROQ_ENABLED && (!env.GROQ_API_KEY || !env.GROQ_MODEL || !env.GROQ_COST_CONTROLS_APPROVED || !env.GROQ_ZDR_CONFIRMED || env.GROQ_DAILY_REQUEST_LIMIT < 1 || env.GROQ_DAILY_TOKEN_LIMIT < 1 || env.GROQ_DAILY_BUDGET_MICRO_USD < 1 || env.GROQ_INPUT_USD_PER_MILLION <= 0 || env.GROQ_OUTPUT_USD_PER_MILLION <= 0)) issue("GROQ_ENABLED", "Groq requires model, credentials, approved cost/data controls and bounded quota/pricing");
});

export function parseServerEnv(raw: Record<string, unknown> = process.env) {
  const result = schema.safeParse(raw);
  if (!result.success) throw new Error(`Invalid server configuration: ${[...new Set(result.error.issues.map((issue) => issue.path[0]))].join(", ")}`);
  return result.data;
}
