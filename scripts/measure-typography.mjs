// R1-01: local single-run mobile measurements; not field data or G7 approval.
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const reservation = createServer(); reservation.listen(0, "127.0.0.1"); await once(reservation, "listening");
const port = reservation.address().port;
await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
let output = "";
server.stdout.on("data", (chunk) => { output += chunk; }); server.stderr.on("data", (chunk) => { output += chunk; });
let chrome;
try {
  const deadline = Date.now() + 30000;
  while (!output.includes("Ready")) {
    assert.equal(server.exitCode, null, output); assert.ok(Date.now() < deadline, output);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  chrome = await launch({ chromePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", chromeFlags: ["--headless", "--disable-background-networking"] });
  const summaries = [];
  for (const [path, name] of [["/", "home"], ["/destinations/nha-trang", "nha-trang-shell"], ["/privacy", "privacy-shell"]]) {
    const result = await lighthouse(`http://127.0.0.1:${port}${path}`, {
      port: chrome.port, logLevel: "error", output: "json", onlyCategories: ["performance", "accessibility", "best-practices"],
      formFactor: "mobile", throttlingMethod: "simulate", screenEmulation: { mobile: true, width: 360, height: 800, deviceScaleFactor: 1, disabled: false },
    });
    assert.ok(result && !result.lhr.runtimeError, JSON.stringify(result?.lhr.runtimeError));
    const { lhr } = result;
    await writeFile(`docs/reports/evidence/R1-lighthouse-${name}.json`, JSON.stringify(lhr, null, 2));
    summaries.push({ path, lighthouseVersion: lhr.lighthouseVersion, userAgent: lhr.userAgent, scores: Object.fromEntries(Object.entries(lhr.categories).map(([key, category]) => [key, Math.round(category.score * 100)])),
      fcpMs: lhr.audits["first-contentful-paint"].numericValue, lcpMs: lhr.audits["largest-contentful-paint"].numericValue,
      cls: lhr.audits["cumulative-layout-shift"].numericValue, tbtMs: lhr.audits["total-blocking-time"].numericValue,
      fonts: lhr.audits["network-requests"].details.items.filter((item) => /\.(ttf|woff2?)(\?|$)/.test(item.url)).map(({ url, transferSize, resourceSize }) => ({ file: new URL(url).pathname, transferSize, resourceSize })),
      conditions: lhr.configSettings });
  }
  const summary = { scope: "One production-build local run per current route; destination/privacy are shells. Mobile360, simulated throttling, 3D idle. Not field data, complete product journeys, a full WCAG audit or G7 PASS.", summaries };
  await writeFile("docs/reports/evidence/R1-performance.json", JSON.stringify(summary, null, 2)); console.log(JSON.stringify(summary, null, 2));
} finally {
  if (chrome) await chrome.kill();
  if (server.exitCode === null) { const stopped = once(server, "exit"); server.kill(); await stopped; }
}
