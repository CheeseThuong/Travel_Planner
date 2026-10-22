import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { assertLocalProject, localCommand, verifyLocalNetwork, localNetworkId, assertLocalDockerEndpoint, startupDiagnostics } from "../../scripts/supabase-local.mjs";

test("startup diagnostics contain only migration identity and SQLSTATE, never raw payloads", () => {
  const output = 'Applying migration 20261022000300_trip_transactions.sql\nERROR: test failure (SQLSTATE 42501)\nprivate coordinates and token=do-not-print-me';
  assert.deepEqual(startupDiagnostics(output), { last_migration: "20261022000300_trip_transactions.sql", sqlstates: ["42501"] });
  assert.deepEqual(startupDiagnostics("Unstructured secret value"), { last_migration: null, sqlstates: [] });
});

test("disposable DB cannot target a remote Docker daemon", () => {
  assertLocalDockerEndpoint("npipe:////./pipe/dockerDesktopLinuxEngine");
  assertLocalDockerEndpoint("unix:///var/run/docker.sock");
  for (const endpoint of ["tcp://127.0.0.1:2375", "ssh://remote", "https://remote", undefined]) assert.throws(() => assertLocalDockerEndpoint(endpoint));
});

test("local network guard requires repository ownership and loopback binding", () => {
  const safe = { Name: localNetworkId, Driver: "bridge", Labels: { "travel-planner.disposable": "true" }, Options: { "com.docker.network.bridge.host_binding_ipv4": "127.0.0.1" } };
  verifyLocalNetwork(safe);
  assert.throws(() => verifyLocalNetwork({ ...safe, Options: { "com.docker.network.bridge.host_binding_ipv4": "0.0.0.0" } }));
  assert.throws(() => verifyLocalNetwork({ ...safe, Labels: {} }));
});

test("disposable command allowlist cannot forward remote flags", () => {
  assert.deepEqual(localCommand("reset"), ["db", "reset", "--local"]);
  for (const action of ["--linked", "reset --linked", "push", "link", "test --db-url remote"]) assert.throws(() => localCommand(action));
});

test("local guard rejects foreign project identity and linked metadata", () => {
  const root = mkdtempSync(join(tmpdir(), "planner-local-guard-"));
  try {
    mkdirSync(join(root, "supabase/.temp"), { recursive: true });
    const config = join(root, "supabase/config.toml");
    writeFileSync(config, 'project_id = "shared-project"');
    assert.throws(() => assertLocalProject(root));
    writeFileSync(config, 'project_id = "travel-planner-disposable-local"');
    assert.ok(assertLocalProject(root));
    writeFileSync(join(root, "supabase/.temp/project-ref"), "foreign-project");
    assert.throws(() => assertLocalProject(root));
  } finally {
    // mkdtemp's exact owned path, never derived from external configuration.
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep));
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI-generated main marker is local, while named branches remain rejected", () => {
  const root = mkdtempSync(join(tmpdir(), "planner-local-main-"));
  try {
    mkdirSync(join(root, "supabase/.branches"), { recursive: true });
    writeFileSync(join(root, "supabase/config.toml"), 'project_id = "travel-planner-disposable-local"');
    const marker = join(root, "supabase/.branches/_current_branch");
    writeFileSync(marker, "main");
    assert.doesNotThrow(() => assertLocalProject(root));
    writeFileSync(marker, "feature-private-branch");
    assert.throws(() => assertLocalProject(root));
  } finally {
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep));
    rmSync(root, { recursive: true, force: true });
  }
});
