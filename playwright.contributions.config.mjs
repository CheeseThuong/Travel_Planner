import { defineConfig } from "@playwright/test";

const url = process.env.LOCAL_SUPABASE_URL, key = process.env.LOCAL_SUPABASE_PUBLISHABLE_KEY;
if (!/^http:\/\/(127\.0\.0\.1|localhost):35321$/.test(url ?? "") || !key || !process.env.LOCAL_AUTH_TEST_MARKER || !process.env.LOCAL_CONTRIBUTION_MODERATOR_TOKEN) throw new Error("Use guarded disposable contribution browser harness");
export default defineConfig({
  testDir: "./tests/contributions", outputDir: "./test-results/contributions", workers: 1, retries: 0,
  reporter: [["list"], ["json", { outputFile: `docs/reports/evidence/${process.env.CONTRIBUTION_EVIDENCE_PREFIX ?? "SI03-02"}-browser-results.json` }]],
  // Real Auth cookies must never be embedded in public traces/videos/screenshots.
  use: { baseURL: "http://127.0.0.1:3397", channel: "chrome", trace: "off", video: "off", screenshot: "off" },
  webServer: { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3397", url: "http://127.0.0.1:3397", reuseExistingServer: false, timeout: 30000,
    env: { CLOUD_ENABLED: "true", DEPLOYMENT_ENV: "local", NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key, BRAVE_ENABLED: "false", GROQ_ENABLED: "false", GROQ_MODEL: "", GOOGLE_MAPS_LIVE_ENABLED: "false", NEXT_TELEMETRY_DISABLED: "1" } },
  projects: [{ name: "desktop", use: { viewport: { width: 1440, height: 1000 } } }, { name: "mobile", use: { viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true } }],
});
