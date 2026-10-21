// P01-01-COMPAT: reproducible snapshots from the installed locked packages.
import { createRequire } from "node:module";
import { dirname, resolve, join } from "node:path";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, cpSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const fromNext = createRequire(require.resolve("eslint-config-next"));
for (const [name, version] of [["eslint-plugin-react", "7.37.5"], ["eslint-plugin-jsx-a11y", "6.10.2"], ["eslint-plugin-import", "2.32.0"]]) {
  const source = dirname(fromNext.resolve(`${name}/package.json`));
  const destination = resolve("vendor", `${name}-compat`);
  assert.ok(!existsSync(destination), `Refuse to overwrite reviewed snapshot: ${destination}`);
  const original = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));
  assert.equal(original.version, version);
  mkdirSync(destination, { recursive: true });
  const hashes = {};
  for (const path of readdirSync(source, { recursive: true })) {
    const relative = path.replaceAll("\\", "/");
    if (relative.startsWith("node_modules/") || !statSync(join(source, path)).isFile() || path === "package.json") continue;
    const data = readFileSync(join(source, path));
    cpSync(join(source, path), join(destination, path));
    hashes[relative] = createHash("sha256").update(data).digest("hex");
  }
  writeFileSync(join(destination, "project-compat.cjs"), `// Project adapter; original rule implementations are unmodified. See UPSTREAM.json.\nconst { fixupPluginRules } = require('@eslint/compat');\nmodule.exports = fixupPluginRules(require('./${original.main}'));\n`);
  const patched = { ...original, version: `${version}+project.1`, private: true, main: "project-compat.cjs", description: `Project-maintained ESLint10 compatibility adapter for ${name}@${version}; not an upstream release`, dependencies: { ...original.dependencies, "@eslint/compat": "2.1.1" }, peerDependencies: { ...original.peerDependencies, eslint: "^10.13.0" } };
  delete patched.devDependencies; delete patched.scripts;
  writeFileSync(join(destination, "package.json"), JSON.stringify(patched, null, 2) + "\n");
  writeFileSync(join(destination, "UPSTREAM.json"), JSON.stringify({ name, version, originalPackage: original, registry: `https://registry.npmjs.org/${name}/${version}`, acquiredFrom: "Existing lockfile-backed installation", modifiedFiles: ["package.json", "project-compat.cjs (new)"], sha256: hashes }, null, 2) + "\n");
  console.log(`${name}: ${Object.keys(hashes).length} original files preserved; explicit compatibility entrypoint added`);
}
