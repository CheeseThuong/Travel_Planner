import { defineConfig } from "@playwright/test";

const demoPort = Number(process.env.DEMO_PORT ?? 3391);

export default defineConfig({
  testDir: "./tests/demo",
  outputDir: "./test-results/demo",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: `docs/reports/evidence/${process.env.DEMO_EVIDENCE_PREFIX ?? "P01-05"}-browser-results.json` }]],
  use: { baseURL: `http://127.0.0.1:${demoPort}`, channel: "chrome", trace: "retain-on-failure", launchOptions: { args: process.env.CI ? ["--enable-unsafe-swiftshader"] : [] } },
  webServer: { command: `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${demoPort}`, url: `http://127.0.0.1:${demoPort}`, reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "true", timeout: 30000, env: { NEXT_TELEMETRY_DISABLED: "1", DEPLOYMENT_ENV: "local", CLOUD_ENABLED: "false", DOC_WEATHER_ENABLED: "false", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", GOOGLE_MAPS_LIVE_ENABLED: "false", BRAVE_ENABLED: "false", GROQ_ENABLED: "false", GROQ_MODEL: "" } },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true } },
  ],
});
