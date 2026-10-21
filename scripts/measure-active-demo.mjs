import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
  await page.goto("http://127.0.0.1:3392/");
  await page.getByRole("button", { name: "Bật 3D", exact: true }).click();
  const canvas = page.locator("canvas");
  await canvas.waitFor();
  await page.getByTestId("postcard-scene").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Number(document.querySelector("canvas")?.dataset.frames) > 5);
  const sample = await canvas.evaluate(async (element) => {
    const gl = element.getContext("webgl2");
    const extension = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : "Unavailable";
    const start = performance.now(), frames = Number(element.dataset.frames);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const elapsedMs = performance.now() - start;
    const renderedFrames = Number(element.dataset.frames) - frames;
    return { elapsedMs, renderedFrames, averageRenderedFps: renderedFrames / elapsedMs * 1000, renderer, width: element.width, height: element.height, userAgent: navigator.userAgent };
  });
  const result = { scope: "One five-second desktop local sample, headless installed Chrome; no CPU/network throttle. Scene targets at most 30fps. This machine's renderer only; not a real-mobile/GPU memory benchmark or G7 approval.", sample };
  writeFileSync("docs/reports/evidence/P01-05-active-performance.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
