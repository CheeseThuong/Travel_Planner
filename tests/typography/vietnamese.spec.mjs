import { test, expect } from "@playwright/test";

const routes = [["/", "home"], ["/destinations/nha-trang", "nha-trang"], ["/destinations/da-lat", "da-lat"], ["/plan/new", "wizard-shell"], ["/trips/local", "editor-shell"], ["/privacy", "privacy"], ["/terms", "terms"], ["/open", "open"], ["/shared", "shared"]];
const evidencePrefix = process.env.TYPOGRAPHY_EVIDENCE_PREFIX ?? "R1";
const vietnamese = "Chuyến đi nhỏ. Kỷ niệm thật to. Quyền riêng tư. Điều khoản sử dụng. Nhiều trải nghiệm. Từ phố biển đến đồi thông. Đà Lạt. Nha Trang.";

test("Vietnamese headings use complete local faces and fit actual routes", async ({ page }, info) => {
  const errors = [], remoteFonts = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) remoteFonts.push(request.url()); });
  for (const [path, name] of routes) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    // Settle Next link prefetches before the next full document navigation.
    // WebKit reports fetch cancellations during teardown as page errors.
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `docs/reports/evidence/${evidencePrefix}-rendered/${info.project.name}-${name}.png`, fullPage: true, animations: "disabled" });
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    expect(await heading.evaluate((node) => getComputedStyle(node).fontFamily)).toMatch(/nunito/i);
    expect(await page.locator("body").evaluate((node) => getComputedStyle(node).fontFamily)).toMatch(/beVietnam/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(info.project.use.viewport.width);
    // Compare per-grapheme boxes: no combining mark detached onto another line.
    const broken = await heading.evaluate((element) => {
      const segmenter = new Intl.Segmenter("vi", { granularity: "grapheme" });
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const failures = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        for (const { segment, index } of segmenter.segment(node.textContent)) {
          if (!segment.trim()) continue;
          const range = document.createRange(); range.setStart(node, index); range.setEnd(node, index + segment.length);
          const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
          if (new Set(rects.map((rect) => Math.round(rect.top))).size > 1) failures.push(segment);
        }
      }
      return failures;
    });
    expect(broken).toEqual([]);
  }
  expect(remoteFonts).toEqual([]); expect(errors).toEqual([]);
  await page.evaluate((sample) => {
    const section = document.createElement("section"); section.id = "glyph-proof"; section.className = "page-shell";
    for (const type of ["display-type", "display-type italic", "body-proof"]) {
      for (const text of [sample.normalize("NFC"), sample.normalize("NFD")]) {
        const paragraph = document.createElement("p"); paragraph.className = type; paragraph.textContent = text; paragraph.style.cssText = "font-size:32px;line-height:1.5"; section.append(paragraph);
      }
    }
    document.querySelector("main").replaceChildren(section);
  }, vietnamese);
  await page.evaluate(() => document.fonts.ready);
  const faces = await page.evaluate(() => [...document.fonts].map(({ family, status, style, weight }) => ({ family, status, style, weight })));
  expect(faces.filter((face) => face.status === "loaded").some((face) => /nunito/i.test(face.family) && face.style === "italic")).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(info.project.use.viewport.width);
  await page.screenshot({ path: `docs/reports/evidence/${evidencePrefix}-rendered/${info.project.name}-nfc-nfd.png`, fullPage: true });
  await info.attach("font-faces", { body: JSON.stringify(faces), contentType: "application/json" });
});

test("delayed fonts stay readable and settle without significant layout shift", async ({ page }, info) => {
  await page.addInitScript(() => {
    window.typographyShifts = [];
    if (PerformanceObserver.supportedEntryTypes.includes("layout-shift")) new PerformanceObserver((list) => { for (const item of list.getEntries()) if (!item.hadRecentInput) window.typographyShifts.push(item.value); }).observe({ type: "layout-shift", buffered: true });
  });
  let delayed = 0;
  await page.route(/\.(ttf|woff2?)(\?.*)?$/, async (route) => { delayed++; await new Promise((resolve) => setTimeout(resolve, 600)); await route.continue(); });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Chuyến đi nhỏ.");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  expect(delayed).toBeGreaterThan(0);
  const shifts = await page.evaluate(() => window.typographyShifts);
  expect(shifts.reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(0.1);
  await info.attach("font-load-layout-shifts", { body: JSON.stringify({ shifts, supported: await page.evaluate(() => PerformanceObserver.supportedEntryTypes.includes("layout-shift")) }), contentType: "application/json" });
});

test("failed font requests preserve readable text and navigation", async ({ page }, info) => {
  await page.route(/\.(ttf|woff2?)(\?.*)?$/, (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Chuyến đi nhỏ.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(info.project.use.viewport.width);
  await page.getByRole("link", { name: /Đà Lạt/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Đà Lạt");
});

test("without JavaScript Vietnamese text and native links remain usable", async ({ browser }, info) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: "reduce", viewport: info.project.use.viewport });
  try {
    const page = await context.newPage(); await page.goto("http://127.0.0.1:3395/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Chuyến đi nhỏ.");
    // Poll the serializable load state; Gecko's disabled-script context does
    // not settle the FontFaceSet.ready promise returned across automation.
    await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe("loaded");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(info.project.use.viewport.width);
    await page.getByRole("link", { name: /Nha Trang/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nha Trang");
  } finally { await context.close(); }
});
