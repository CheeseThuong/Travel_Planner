// Isolated development build: catches warnings which production React may omit.
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { chromium } from "@playwright/test";

const root = process.cwd();
mkdirSync(resolve(root, ".tools"), { recursive: true });
const stage = mkdtempSync(resolve(root, ".tools/hydration-check-"));
for (const file of ["src", "public", "data", "docs/content", "package.json", "tsconfig.json", "next-env.d.ts", "next.config.ts", "postcss.config.mjs"]) {
  if (existsSync(resolve(root, file))) cpSync(resolve(root, file), resolve(stage, file), { recursive: true });
}
symlinkSync(resolve(root, "node_modules"), resolve(stage, "node_modules"), "junction");
const reservation = createServer(); reservation.listen(0, "127.0.0.1"); await once(reservation, "listening");
const port = reservation.address().port; await new Promise(done => reservation.close(done));
const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "dev", stage, "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: stage, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", DEPLOYMENT_ENV: "local", CLOUD_ENABLED: "false", DOC_WEATHER_ENABLED: "false", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", GOOGLE_MAPS_LIVE_ENABLED: "false", BRAVE_ENABLED: "false", GROQ_ENABLED: "false", GROQ_MODEL: "" },
});
let output = "", browser;
child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
const summary = { environment: "isolated Next development copy, extension-free Chrome", clean: [], controlledInjection: null, actualUserExtension: "NOT IDENTIFIED" };
try {
  const deadline = Date.now() + 60000;
  while (!output.includes("Ready")) {
    assert.equal(child.exitCode, null, "Owned dev server exited"); assert.ok(Date.now() < deadline, "Dev server readiness timeout");
    await new Promise(done => setTimeout(done, 100));
  }
  browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage(); const issues = [];
  page.on("console", message => { if (/hydrat|server rendered|didn't match/i.test(message.text())) issues.push(message.text()); });
  page.on("pageerror", error => issues.push(error.message));
  for (const path of ["/", "/plans", "/cam-hung/da-lat", "/plan/new?destination=da-lat"]) {
    const response = await page.goto(origin + path, { timeout: 60000 }); assert.equal(response.status(), 200);
    assert.ok(!/bis_skin_checked|bis_register|__processed_/.test(await response.text()), "SSR unexpectedly contains marker");
    await page.locator("main").waitFor();
    // A React event verifies hydration has finished on each page.
    if (path === "/plans") { await page.getByLabel("Mã DOC", { exact: true }).fill("invalid"); await page.getByRole("button", { name: "Mở kế hoạch", exact: true }).click(); await page.getByRole("status").waitFor(); }
    if (path.includes("cam-hung")) await page.getByLabel("Khám phá nơi muốn ghé").fill("cà phê");
    if (path.includes("plan/new")) await page.getByLabel("Ngày bắt đầu").fill("2026-11-10");
    summary.clean.push({ path, status: 200, hydrationWarnings: issues.length });
  }
  assert.deepEqual(issues, [], "Clean development browser has hydration/runtime warnings");
  await page.close();
  const injected = await browser.newPage(), warnings = [];
  injected.on("console", message => { if (/hydrat|server rendered|didn't match/i.test(message.text())) warnings.push(message.text()); });
  await injected.route(origin + "/", async route => {
    const response = await route.fetch(); const html = await response.text();
    assert.ok(!html.includes("bis_skin_checked"));
    await route.fulfill({ response, body: html.replace(/<body\b/, '<body bis_skin_checked="1" bis_register="controlled-fixture" __processed_fixture__="true"') });
  });
  await injected.goto(origin, { timeout: 60000 });
  await injected.getByRole("region", { name: "Thời tiết da-lat" }).getByRole("status").filter({ hasText: "Chưa có dự báo" }).waitFor();
  assert.ok(warnings.some(message => /bis_skin_checked|bis_register|__processed_fixture__/.test(message)), "Controlled pre-hydration marker injection should reproduce the warning");
  summary.controlledInjection = { reproduced: true, markers: ["bis_skin_checked", "bis_register", "__processed_fixture__"], warningCount: warnings.length };
  console.log(JSON.stringify(summary, null, 2));
  writeFileSync(resolve(root, "docs/reports/evidence/R-HYDRATION-20261030-hydration.json"), JSON.stringify(summary, null, 2));
} finally {
  await browser?.close(); child.kill();
  writeFileSync(resolve(stage, "server-output.txt"), output);
}
