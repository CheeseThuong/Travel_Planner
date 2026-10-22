import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { buildWindowsDockerAdapter } from "../../scripts/prepare-docker-loopback.mjs";

// This adapter is Windows-only; Linux uses native Docker plus actual port checks.
if (process.platform === "win32") test("Windows adapter builds offline and validates scoped argument forwarding", () => {
  const env = { ...process.env }, originalPath = process.env.PATH;
  const executable = buildWindowsDockerAdapter(resolve("."), env);
  const result = execFileSync(executable, ["--self-test"], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert.match(result, /^PASS: scoped loopback adapter argument tests/);
  assert.equal(process.env.PATH, originalPath, "Global PATH must remain unchanged");
});

if (process.platform === "win32") test("adapter preserves child stdin, stdout, stderr, literal arguments and exit status", () => {
  const env = { ...process.env, TRAVEL_PLANNER_REAL_DOCKER: process.execPath };
  const executable = buildWindowsDockerAdapter(resolve("."), env);
  const opaque = ['literal "quotes" \\ path', "& $(literal) `literal`", "Tiếng Việt"];
  const result = execFileSync(executable, ["-e", "process.stdout.write(JSON.stringify(process.argv.slice(1)))", "--", ...opaque], { env, encoding: "utf8" });
  assert.deepEqual(JSON.parse(result), opaque);
  const input = "SQL fixture stdin with 'quotes' and \\slashes";
  assert.equal(execFileSync(executable, ["-e", "process.stdin.pipe(process.stdout)"], { env, input, encoding: "utf8" }), input);
  assert.throws(() => execFileSync(executable, ["-e", "process.stdout.write('out');process.stderr.write('err');process.exitCode=7"], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), (error) => error.status === 7 && error.stdout === "out" && error.stderr === "err");
});
