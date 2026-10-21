import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, mkdtempSync, rmSync, realpathSync } from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { ESLint } from "eslint";

const vendor = resolve("vendor/eslint-plugin-next");
const require = createRequire(join(vendor, "package.json"));
const { getRootDirs } = require("./dist/utils/get-root-dirs.js");
const posix = (value) => value.replaceAll("\\", "/");

test("all upstream rule implementations and config exports are byte-identical", () => {
  const manifest = JSON.parse(readFileSync(join(vendor, "UPSTREAM.json"), "utf8"));
  for (const [path, hash] of Object.entries(manifest.sha256)) {
    if (path === "dist/utils/get-root-dirs.js") continue;
    assert.equal(createHash("sha256").update(readFileSync(join(vendor, path))).digest("hex"), hash, path);
  }
});

test("enabled rule IDs, severities, options and settings match before patch", async () => {
  const baseline = JSON.parse(readFileSync("docs/reports/evidence/P01-01-lint-baseline.json", "utf8"));
  const eslint = new ESLint();
  for (const [file, before] of Object.entries(baseline)) {
    const config = await eslint.calculateConfigForFile(file);
    // Resolver identity/options are stable; npm may hoist the exact same module
    // from config-next/node_modules to root and CI has a different drive/path.
    const portable = (value) => {
      const result = JSON.parse(JSON.stringify(value));
      const resolvers = result.settings?.["import/resolver"];
      if (resolvers) result.settings["import/resolver"] = Object.fromEntries(Object.entries(resolvers).map(([path, options]) => [path.replaceAll("\\", "/").split("/node_modules/").at(-1), options]));
      // ESLint10 materializes defaults on this disabled core rule. Its active
      // TypeScript replacement/options are compared unchanged and tested below.
      if (result.rules["no-unused-vars"]?.[0] === 0) result.rules["no-unused-vars"] = [0];
      return result;
    };
    assert.deepEqual(portable({ rules: config.rules, settings: config.settings }), portable(before));
  }
});

test("root scanner preserves literals, brace sets, globstar, arrays and Windows separators", () => {
  const parent = resolve(".tools"); mkdirSync(parent, { recursive: true });
  const root = mkdtempSync(join(parent, "lint-fixture-"));
  try {
    for (const path of ["apps/one/nested", "apps/two", "other"]) mkdirSync(join(root, path), { recursive: true });
    const scan = (rootDir) => getRootDirs({ cwd: root, settings: { next: { rootDir } } }).sort();
    const path = (name) => posix(join(root, name));
    assert.deepEqual(scan(join(root, "apps/one")), [path("apps/one")]);
    assert.deepEqual(scan(`${path("apps")}/{one,two}`), [path("apps/one"), path("apps/two")]);
    assert.deepEqual(scan(`${path("apps")}/*`), [path("apps/one"), path("apps/two")]);
    assert.deepEqual(scan(`${path("apps")}/**`), [path("apps/one"), path("apps/one/nested"), path("apps/two")]);
    assert.deepEqual(scan([join(root, "apps/one"), join(root, "other"), 123]), [path("apps/one"), path("other")]);
    assert.deepEqual(scan(join(root, "missing")), []);
    assert.deepEqual(getRootDirs({ cwd: root, settings: {} }), [root]);
    assert.deepEqual(scan(join(root, "apps/one").replaceAll("/", "\\")), [path("apps/one")]);
  } finally {
    assert.equal(dirname(realpathSync(root)), realpathSync(parent));
    assert.ok(basename(root).startsWith("lint-fixture-"));
    rmSync(root, { recursive: true });
  }
});

test("pathological glob inputs fail explicitly before recursive parsing", () => {
  for (const rootDir of ["{".repeat(100) + "a,b" + "}".repeat(100), "a".repeat(5000)]) {
    assert.throws(() => getRootDirs({ cwd: process.cwd(), settings: { next: { rootDir } } }), /safety limit/);
  }
});

const violations = [
  ["Next image rule", 'export default function Demo(){return <img src="/x.png" alt="x"/>}', "@next/next/no-img-element"],
  ["React duplicate props", 'export default function Demo(){return <div id="a" id="b"/>}', "react/jsx-no-duplicate-props"],
  ["React list keys", 'export default function Demo(){return [1].map(x=><div>{x}</div>)}', "react/jsx-key"],
  ["accessibility", 'export default function Demo(){return <img src="/x.png"/>}', "jsx-a11y/alt-text"],
  ["TypeScript", 'export const value: any = 1;', "@typescript-eslint/no-explicit-any"],
  ["hooks", 'import {useState} from "react"; export default function Demo({on}:{on:boolean}){if(on){useState(0)}return <div/>}', "react-hooks/rules-of-hooks"],
];
for (const [label, code, rule] of violations) {
  test(`${label} violation is still detected`, async () => {
    const [result] = await new ESLint().lintText(code, { filePath: "src/lint-regression.tsx" });
    assert.ok(result.messages.some((message) => message.ruleId === rule), JSON.stringify(result.messages));
  });
}
