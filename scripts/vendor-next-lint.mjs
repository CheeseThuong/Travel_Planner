// One-time, explicit source acquisition from the already installed npm package.
import assert from "node:assert/strict";
import { cpSync, existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, relative, join } from "node:path";

const source = resolve("node_modules/@next/eslint-plugin-next");
const destination = resolve("vendor/eslint-plugin-next");
assert.ok(!existsSync(destination), "Refuse to replace an existing reviewed vendor snapshot");
const original = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));
assert.equal(original.version, "16.4.2");
const hashes = {};
for (const name of readdirSync(join(source, "dist"), { recursive: true })) {
  if (!/\.(?:js|ts)$/.test(name)) continue;
  hashes[`dist/${name.replaceAll("\\", "/")}`] = createHash("sha256").update(readFileSync(join(source, "dist", name))).digest("hex");
}
mkdirSync(destination, { recursive: true });
cpSync(join(source, "dist"), join(destination, "dist"), { recursive: true });
cpSync(resolve("node_modules/next/license.md"), join(destination, "LICENSE"));
writeFileSync(join(destination, "package.json"), JSON.stringify({ name: original.name, version: "16.4.2-project.1", private: true, main: original.main, types: original.types, license: "MIT", description: "Project-reviewed Next16.4.2 lint plugin; root glob security patch, all rules unchanged", dependencies: { "@eslint-community/eslint-utils": "4.9.1", tinyglobby: "0.2.17" } }, null, 2) + "\n");
writeFileSync(join(destination, "UPSTREAM.json"), JSON.stringify({ package: original.name, version: original.version, registry: "https://registry.npmjs.org/@next/eslint-plugin-next/16.4.2", acquiredFrom: "Existing integrity-locked npm installation", license: "MIT", modifiedFiles: ["dist/utils/get-root-dirs.js", "package.json"], originalPackage: original, sha256: hashes }, null, 2) + "\n");
console.log(`Vendored ${Object.keys(hashes).length} source/type files to ${relative(process.cwd(), destination)}; all checksums recorded before the helper patch.`);
