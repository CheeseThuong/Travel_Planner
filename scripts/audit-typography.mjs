// R1-01: inspect actual platform glyph selection before/after the correction.
import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";

const phase = process.argv[2] ?? "before";
if (!["before", "after"].includes(phase)) throw new Error("Use before or after");
const directory = `docs/reports/evidence/R1-${phase}`;
await mkdir(directory, { recursive: true });
const reservation = createServer(); reservation.listen(0, "127.0.0.1"); await once(reservation, "listening");
const port = reservation.address().port;
await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
let output = "";
server.stdout.on("data", (chunk) => { output += chunk; }); server.stderr.on("data", (chunk) => { output += chunk; });
const deadline = Date.now() + 30000;
while (!output.includes("Ready")) {
  assert.equal(server.exitCode, null, output); assert.ok(Date.now() < deadline, output);
  await new Promise((resolve) => setTimeout(resolve, 100));
}
const browser = await chromium.launch({ channel: "chrome" });
try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send("DOM.enable"); await client.send("CSS.enable");
  const results = [];
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ["/", "/destinations/nha-trang", "/destinations/da-lat", "/privacy", "/terms", "/plan/new", "/open"]) {
      await page.goto(`http://127.0.0.1:${port}${path}`);
      await page.evaluate(() => document.fonts.ready);
      const { root } = await client.send("DOM.getDocument");
      const { nodeId } = await client.send("DOM.querySelector", { nodeId: root.nodeId, selector: "h1" });
      const fonts = await client.send("CSS.getPlatformFontsForNode", { nodeId });
      if (phase === "after") assert.ok(fonts.fonts.length > 0 && fonts.fonts.every((font) => font.isCustomFont && ["Nunito-SemiBold", "Nunito-SemiBoldItalic"].includes(font.postScriptName)), JSON.stringify(fonts));
      results.push({ width, path, ...fonts, ...await page.locator("h1").evaluate((node) => ({ text: node.textContent, font: getComputedStyle(node).fontFamily, tracking: getComputedStyle(node).letterSpacing, scrollWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth })) });
      await page.screenshot({ path: `${directory}/${width}-${path === "/" ? "home" : path.slice(1).replaceAll("/", "-")}.png`, fullPage: true, animations: "disabled" });
    }
  }
  if (phase === "after") {
    const corpus = "Chuyến đi nhỏ. Kỷ niệm thật to. Quyền riêng tư. Điều khoản sử dụng. Nhiều trải nghiệm. Từ phố biển đến đồi thông. Đà Lạt. Nha Trang. " + Array.from({ length: 90 }, (_, i) => String.fromCodePoint(0x1ea0 + i)).join("");
    await page.evaluate((text) => {
      const section = document.createElement("section"); section.className = "page-shell";
      for (const [id, className] of [["normal-proof", "display-type"], ["italic-proof", "display-type italic"], ["body-proof", ""]]) {
        const p = document.createElement("p"); p.id = id; p.className = className; p.textContent = text.normalize("NFC") + " " + text.normalize("NFD"); section.append(p);
      }
      document.querySelector("main").replaceChildren(section);
    }, corpus);
    await page.evaluate(() => document.fonts.ready);
    const { root } = await client.send("DOM.getDocument");
    for (const selector of ["#normal-proof", "#italic-proof", "#body-proof"]) {
      const { nodeId } = await client.send("DOM.querySelector", { nodeId: root.nodeId, selector });
      const fonts = await client.send("CSS.getPlatformFontsForNode", { nodeId });
      const allowedFaces = selector === "#body-proof" ? ["BeVietnamPro-Regular"] : selector === "#italic-proof" ? ["Nunito-SemiBoldItalic"] : ["Nunito-SemiBold"];
      assert.ok(fonts.fonts.length > 0 && fonts.fonts.every((font) => font.isCustomFont && allowedFaces.includes(font.postScriptName)), JSON.stringify(fonts));
      results.push({ selector, ...fonts });
    }
    await page.screenshot({ path: `${directory}/glyph-corpus.png`, fullPage: true });
  }
  await writeFile(`${directory}/platform-fonts.json`, JSON.stringify({ browser: await browser.version(), results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
  if (server.exitCode === null) { const stopped = once(server, "exit"); server.kill(); await stopped; }
}
