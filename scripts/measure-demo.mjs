import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { writeFileSync } from "node:fs";

const base = "http://127.0.0.1:3392";
const chrome = await launch({ chromePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", chromeFlags: ["--headless", "--disable-background-networking"] });
try {
  const summaries = [];
  for (const [path, name] of [["/", "landing"], ["/destinations/nha-trang", "nha-trang"], ["/destinations/da-lat", "da-lat"]]) {
    const result = await lighthouse(`${base}${path}`, {
      port: chrome.port,
      logLevel: "error",
      output: "json",
      onlyCategories: ["performance", "accessibility", "best-practices"],
      formFactor: "mobile",
      throttlingMethod: "simulate",
      screenEmulation: { mobile: true, width: 360, height: 800, deviceScaleFactor: 1, disabled: false },
    });
    if (!result || result.lhr.runtimeError) throw new Error(JSON.stringify(result?.lhr.runtimeError ?? "No Lighthouse result"));
    const { lhr } = result;
    writeFileSync(`docs/reports/evidence/P01-05-lighthouse-${name}.json`, JSON.stringify(lhr, null, 2));
    summaries.push({
      path, lighthouseVersion: lhr.lighthouseVersion, userAgent: lhr.userAgent,
      scores: Object.fromEntries(Object.entries(lhr.categories).map(([id, value]) => [id, Math.round(value.score * 100)])),
      fcpMs: lhr.audits["first-contentful-paint"].numericValue,
      lcpMs: lhr.audits["largest-contentful-paint"].numericValue,
      tbtMs: lhr.audits["total-blocking-time"].numericValue,
      cls: lhr.audits["cumulative-layout-shift"].numericValue,
      conditions: lhr.configSettings,
    });
    console.log(JSON.stringify(summaries.at(-1)));
  }
  writeFileSync("docs/reports/evidence/P01-05-performance-summary.json", JSON.stringify({ scope: "One local production-build run per route; simulated mobile360 throttling; 3D idle until explicit activation. Not field data, not an active-GPU benchmark or full WCAG/G7 approval.", summaries }, null, 2));
} finally { await chrome.kill(); }
