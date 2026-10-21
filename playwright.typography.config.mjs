import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/typography",
  outputDir: "./test-results/typography",
  fullyParallel: true,
  workers: 3,
  retries: 0,
  timeout: 45000,
  reporter: [["list"], ["json", { outputFile: `docs/reports/evidence/${process.env.TYPOGRAPHY_EVIDENCE_PREFIX ?? "R1"}-browser-results.json` }]],
  use: { baseURL: "http://127.0.0.1:3395", reducedMotion: "reduce", trace: "retain-on-failure" },
  webServer: { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3395", url: "http://127.0.0.1:3395", reuseExistingServer: false, timeout: 30000, env: { NEXT_TELEMETRY_DISABLED: "1" } },
  projects: ["chromium", "firefox", "webkit"].flatMap((browserName) => [320, 360, 390, 768, 1024, 1440].map((width) => ({ name: `${browserName}-${width}`, use: { browserName, ...(browserName === "chromium" ? { channel: "chrome" } : {}), viewport: { width, height: 1000 } } }))),
});
