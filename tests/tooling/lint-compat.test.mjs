import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { ESLint } from "eslint";
import { fixupPluginRules } from "@eslint/compat";

const require = createRequire(import.meta.url);

test("Next config has exactly two redundant context wrappers removed and no rule changes", () => {
  const root = resolve("vendor/eslint-config-next-compat");
  const manifest = JSON.parse(readFileSync(resolve(root, "UPSTREAM.json"), "utf8"));
  for (const [file, hash] of Object.entries(manifest.sha256)) {
    let bytes = readFileSync(resolve(root, file));
    if (file === "dist/index.js") {
      let source = bytes.toString("utf8");
      for (const [adapted, original] of [
        ["react: _eslintpluginreact.default,", "react: (0, _rulecontext.fixupPluginRules)(_eslintpluginreact.default),"],
        ["import: _eslintpluginimport,", "import: (0, _rulecontext.fixupPluginRules)(_eslintpluginimport),"],
      ]) { assert.ok(source.includes(adapted)); source = source.replace(adapted, original); }
      bytes = Buffer.from(source);
    }
    assert.equal(createHash("sha256").update(bytes).digest("hex"), hash, file);
  }
});
for (const name of ["eslint-plugin-react", "eslint-plugin-jsx-a11y", "eslint-plugin-import"]) {
  test(`${name}: all upstream rule/config bytes and metadata preserved`, () => {
    const root = resolve("vendor", `${name}-compat`);
    const upstream = JSON.parse(readFileSync(resolve(root, "UPSTREAM.json"), "utf8"));
    for (const [file, hash] of Object.entries(upstream.sha256)) assert.equal(createHash("sha256").update(readFileSync(resolve(root, file))).digest("hex"), hash, `${name}/${file}`);
    const original = require(resolve(root, upstream.originalPackage.main));
    const adapted = require(name);
    assert.deepEqual(Object.keys(adapted.rules), Object.keys(original.rules));
    for (const [rule, implementation] of Object.entries(original.rules)) assert.deepEqual(adapted.rules[rule].meta, implementation.meta, rule);
    assert.deepEqual(adapted.configs, original.configs);
  });
}

test("maintained core10 is actually loaded, not a nested legacy eslint", () => {
  assert.equal(require("eslint/package.json").version, "10.13.0");
  for (const name of ["eslint-plugin-react", "eslint-plugin-jsx-a11y", "eslint-plugin-import"]) {
    const metadata = require(`${name}/package.json`);
    assert.match(metadata.version, /\+project\.1$/);
    assert.equal(metadata.peerDependencies.eslint, "^10.13.0");
    assert.equal(metadata.dependencies["@eslint/compat"], "2.1.1");
  }
});

test("official adapter restores removed context methods and reports real violations", async () => {
  const plugin = fixupPluginRules({ rules: { legacy: { meta: { schema: [] }, create(context) {
    assert.equal(context.getFilename(), context.filename);
    assert.equal(context.getPhysicalFilename(), context.physicalFilename);
    assert.equal(context.getCwd(), context.cwd);
    assert.equal(context.getSourceCode(), context.sourceCode);
    assert.ok(context.parserOptions);
    return { Identifier(node) { if (node.name === "blockedName") context.report({ node, message: "Legacy rule still enforces its constraint" }); } };
  } } } });
  const eslint = new ESLint({ overrideConfig: [{ plugins: { compatProof: plugin }, rules: { "compatProof/legacy": "error" } }] });
  const [negative] = await eslint.lintText("export const blockedName = 1;", { filePath: "src/compat-proof.ts" });
  assert.equal(negative.messages.filter((message) => message.ruleId === "compatProof/legacy").length, 1);
  const [positive] = await eslint.lintText("export const allowedName = 1;", { filePath: "src/compat-proof.ts" });
  assert.equal(positive.errorCount + positive.warningCount, 0, JSON.stringify(positive.messages));
});

for (const [label, source, rule] of [
  ["React escaping", 'export default function Demo(){return <p>it\'s</p>}', "react/no-unescaped-entities"],
  ["ARIA value types", 'export default function Demo(){return <div aria-hidden="invalid"/>}', "jsx-a11y/aria-proptypes"],
  ["anonymous export", 'export default {}', "import/no-anonymous-default-export"],
]) test(`${label} still produces its expected diagnostic`, async () => {
  const [result] = await new ESLint().lintText(source, { filePath: "src/compat-negative.tsx" });
  assert.ok(result.messages.some((message) => message.ruleId === rule), JSON.stringify(result.messages));
});
