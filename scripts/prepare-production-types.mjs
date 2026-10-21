// P01-01-COMPAT: dev and build generated global aliases cannot coexist.
// Keep strict checking and route validators; discard only stale generated cache.
import { existsSync, readdirSync, readFileSync, rmSync, statSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import assert from "node:assert/strict";

const workspace = resolve(import.meta.dirname, "..");
const target = resolve(workspace, ".next", "dev", "types");
assert.ok(target.startsWith(`${workspace}${sep}.next${sep}`));
if (existsSync(target)) {
  assert.ok(realpathSync(target).startsWith(`${realpathSync(workspace)}${sep}.next${sep}`));
  for (const name of readdirSync(target, { recursive: true })) {
    const file = resolve(target, name);
    assert.ok(file.startsWith(`${target}${sep}`));
    if (!statSync(file).isFile()) continue;
    const headers = { "cache-life.d.ts": "// Type definitions for Next.js cacheLife configs", "root-params.d.ts": "// Type definitions for Next.js root params (next/root-params)", "routes.d.ts": "// This file is generated automatically by Next.js", "validator.ts": "// This file is generated automatically by Next.js" };
    assert.ok(Object.hasOwn(headers, name) && readFileSync(file, "utf8").startsWith(headers[name]), `Refuse to remove an unrecognized file: ${file}`);
  }
  rmSync(target, { recursive: true });
  console.log("Removed stale Next dev-generated type cache; production type generation/checking remains enabled.");
}
