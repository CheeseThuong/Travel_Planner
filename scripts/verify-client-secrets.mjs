// P01-04: build with synthetic canaries only; never print real env values.
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const directory = resolve(".next/static");
let checked = 0;
for (const file of readdirSync(directory, { recursive: true })) {
  if (!/\.(js|css|json)$/.test(file)) continue;
  const text = readFileSync(resolve(directory, file), "utf8");
  for (const marker of ["test-only-google-canary-never-real", "test-only-service-canary-never-real"]) assert.ok(!text.includes(marker), `Server canary found in a client asset: ${file}`);
  checked++;
}
console.log(`PASS: ${checked} client assets contain neither synthetic server canary. No real secret was inspected or printed.`);
