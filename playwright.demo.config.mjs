import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/demo",
  outputDir: "./test-results/demo",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: `docs/reports/evidence/${process.env.DEMO_EVIDENCE_PREFIX ?? "P01-05"}-browser-results.json` }]],
  use: { baseURL: "http://127.0.0.1:3391", channel: "chrome", trace: "retain-on-failure" },
  webServer: { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3391", url: "http://127.0.0.1:3391", reuseExistingServer: false, timeout: 30000, env: { NEXT_TELEMETRY_DISABLED: "1" } },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true } },
  ],
});
