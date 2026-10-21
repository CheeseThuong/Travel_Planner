import { expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, sep } from "node:path";
import ts from "typescript";
import { ESLint } from "eslint";
import { FixtureRoutingProvider } from "@/adapters/testing/fixture-routing";

test("all domain source imports remain entirely within the pure domain", () => {
  const root = resolve("src/domain");
  for (const file of readdirSync(root, { recursive: true }).filter((name) => typeof name === "string" && name.endsWith(".ts"))) {
    const path = resolve(root, String(file));
    const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
    const verify = (specifier: string) => {
      const target = specifier.startsWith("@/domain/") ? resolve("src", specifier.slice(2)) : specifier.startsWith(".") ? resolve(path, "..", specifier) : "";
      expect(target.startsWith(root + sep), `${file}: forbidden import ${specifier}`).toBe(true);
    };
    const visit = (node: ts.Node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) verify(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === "require")) {
        expect(node.arguments.length).toBe(1); const first = node.arguments[0]; expect(ts.isStringLiteral(first)).toBe(true);
        if (ts.isStringLiteral(first)) verify(first.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
});

test("lint rejects framework imports in domain source", async () => {
  const [result] = await new ESLint().lintText('import { useState } from "react"; export const forbidden = useState;', { filePath: "src/domain/forbidden-fixture.ts" });
  expect(result.messages.some(({ ruleId }) => ruleId === "no-restricted-imports")).toBe(true);
});

test("client component import graphs do not reach server-only modules", () => {
  const root = resolve("src"), checked = new Set<string>();
  const visit = (path: string) => {
    if (checked.has(path)) return; checked.add(path);
    expect(path.includes(".server."), `Client import reached ${path}`).toBe(false);
    const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      const target = specifier.startsWith("@/") ? resolve(root, specifier.slice(2)) : specifier.startsWith(".") ? resolve(path, "..", specifier) : "";
      if (!target) continue;
      const candidates = [target, target + ".ts", target + ".tsx", resolve(target, "index.ts")];
      for (const candidate of candidates) { try { readFileSync(candidate); visit(candidate); break; } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT" && (error as NodeJS.ErrnoException).code !== "EISDIR") throw error; } }
    }
  };
  for (const file of readdirSync(root, { recursive: true }).filter((name) => typeof name === "string" && /\.tsx?$/.test(name))) {
    const path = resolve(root, String(file)); if (/^[\s]*(?:"use client"|'use client')/.test(readFileSync(path, "utf8"))) visit(path);
  }
});

test("fixture routing preserves directed and unreachable cells, clones output and aborts", async () => {
  const provider = new FixtureRoutingProvider({ node_ids: ["a", "b"], cells: [[{ status: "unreachable" }, { status: "reachable", duration_minutes: 3, estimate_source: "approximate", uncertainty: "high" }], [{ status: "unreachable" }, { status: "unreachable" }]], warnings: ["Synthetic fixture"], elements_requested: 0 });
  const input = { transport_mode: "walk" as const, nodes: [{ id: "a", lat: 12, lng: 109 }, { id: "b", lat: 12.1, lng: 109.1 }] };
  const first = await provider.estimateMatrix(input); expect(await provider.estimateMatrix(input)).toEqual(first);
  expect(first.cells[0][1].status).toBe("reachable"); expect(first.cells[1][0].status).toBe("unreachable");
  await expect(provider.estimateMatrix({ ...input, nodes: [] })).rejects.toThrow("identity mismatch");
  const abort = new AbortController(); abort.abort(); await expect(provider.estimateMatrix(input, abort.signal)).rejects.toBeDefined();
});
