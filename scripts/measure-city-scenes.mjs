import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const reservation = createServer(); reservation.listen(0, "127.0.0.1"); await once(reservation, "listening");
const port = reservation.address().port; await new Promise((done) => reservation.close(done));
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
let output = "", browser;
server.stdout.on("data", (chunk) => { output += chunk; }); server.stderr.on("data", (chunk) => { output += chunk; });
try {
  const deadline = Date.now() + 30000;
  while (!output.includes("Ready")) { assert.equal(server.exitCode, null, output); assert.ok(Date.now() < deadline, output); await new Promise((done) => setTimeout(done, 100)); }
  browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
  const samples = [];
  for (const slug of ["nha-trang", "da-lat"]) {
    await page.goto(`http://127.0.0.1:${port}/destinations/${slug}`);
    await page.getByRole("button", { name: "Bật 3D", exact: true }).click();
    const canvas = page.locator("canvas"); await canvas.waitFor(); await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => Number(document.querySelector("canvas")?.dataset.frames) > 5);
    const sample = await canvas.evaluate(async (node) => {
      const gl = node.getContext("webgl2"), debug = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : "Unavailable";
      const start = performance.now(), frames = Number(node.dataset.frames);
      await new Promise((done) => setTimeout(done, 5000));
      const elapsed_ms = performance.now() - start, rendered_frames = Number(node.dataset.frames) - frames;
      return { elapsed_ms, rendered_frames, average_fps: rendered_frames / elapsed_ms * 1000, renderer, draw_calls: Number(node.dataset.drawCalls), triangles: Number(node.dataset.triangles), uploaded_geometries: Number(node.dataset.geometries), width: node.width, height: node.height, user_agent: navigator.userAgent };
    });
    samples.push({ slug, ...sample });
    await page.getByRole("button", { name: "Tắt 3D", exact: true }).click(); assert.equal(await page.locator("canvas").count(), 0);
  }
  const result = { scope: "One five-second sample per city in local headless Chrome, desktop1440, no throttle, 30fps ceiling. Exact observed renderer; not phone/field/GPU-VRAM evidence or G7 approval.", samples };
  await writeFile("docs/reports/evidence/P01-06-active-performance.json", JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
} finally {
  await browser?.close(); if (server.exitCode === null) { const stopped = once(server, "exit"); server.kill(); await stopped; }
}
