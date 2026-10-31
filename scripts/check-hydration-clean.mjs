/**
 * Local hydration integrity diagnostic for Vietnam Playful Travel Planner.
 * Uses the project's existing @playwright/test package. No dependencies added.
 * No write operations, browser extensions, external API calls, or app changes.
 */
import { chromium } from '@playwright/test';

const origin = process.env.HYDRATION_ORIGIN ?? 'http://127.0.0.1:3000';
const target = new URL(origin);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || !['http:', 'https:'].includes(target.protocol)) {
  throw new Error('HYDRATION_ORIGIN must point to localhost for this local diagnostic.');
}
const routes = ['/', '/plan/new?destination=da-lat', '/destinations/da-lat', '/contribute'];
const suspectAttribute = /\s(?:bis_skin_checked|bis_register|__processed_[\w-]+__)\s*=/i;
const hydrationSignal = /hydration|hydrated but|server.rendered.html.didn.t.match|didn.t.match.the.client|text content does not match/i;
let browser;
let failed = false;

function labelsForDom() {
  const results = [];
  for (const element of document.querySelectorAll('*')) {
    for (const name of element.getAttributeNames()) {
      if (name === 'bis_skin_checked' || name === 'bis_register' || /^__processed_[\w-]+__$/.test(name)) {
        results.push(`${element.tagName.toLowerCase()}[${name}]`);
        if (results.length >= 15) return results;
      }
    }
  }
  return results;
}

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-extensions'] });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  for (const route of routes) {
    const url = new URL(route, target).toString();
    const output = { route, status: null, serverInjected: false, domInjected: [], hydrationErrors: [], pageErrors: [] };
    try {
      const response = await fetch(url, { headers: { accept: 'text/html', 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(12000) });
      output.status = response.status;
      const html = await response.text();
      output.serverInjected = suspectAttribute.test(html);
      const page = await context.newPage();
      page.on('console', message => {
        const body = message.text();
        if (hydrationSignal.test(body)) output.hydrationErrors.push(body.slice(0, 500));
      });
      page.on('pageerror', error => {
        if (hydrationSignal.test(error.message)) output.pageErrors.push(error.message.slice(0, 500));
      });
      const navigation = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      if (!navigation?.ok()) output.status = navigation?.status() ?? output.status;
      await page.locator('main').waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(750);
      output.domInjected = await page.evaluate(labelsForDom);
      await page.close();
    } catch (error) {
      output.pageErrors.push(String(error).slice(0, 500));
    }
    const passed = output.status >= 200 && output.status < 400 && !output.serverInjected && output.domInjected.length === 0 && output.hydrationErrors.length === 0 && output.pageErrors.length === 0;
    if (!passed) failed = true;
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${url}`);
    console.log(JSON.stringify(output, null, 2));
  }
  await context.close();
} catch (error) {
  failed = true;
  console.error('Could not run Chrome diagnostic:', error);
  console.error('Make sure Chrome and the repository\'s Playwright dependency are installed.');
} finally {
  await browser?.close();
}
console.log(failed
  ? '\nFAIL: Investigate reported route or DOM mismatch. No source files were modified.'
  : '\nPASS: The app hydrated without detected mismatches in isolated Chrome. If normal Chrome still warns with bis_* markers, restrict the responsible extension on localhost.');
if (failed) process.exitCode = 1;
