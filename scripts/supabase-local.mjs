import assert from "node:assert/strict";
import { existsSync, readFileSync, realpathSync, mkdirSync, createWriteStream, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, execFileSync } from "node:child_process";
import { prepareWindowsDockerAdapter } from "./prepare-docker-loopback.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const localProjectId = "travel-planner-disposable-local";
export const localNetworkId = "travel-planner-disposable-loopback";
export function verifyPublishedPorts(ports) {
  assert.equal(ports.length, 2, "Both database and gateway must be inspected");
  for (const service of ports) {
    let count = 0;
    for (const bindings of Object.values(service)) for (const binding of bindings ?? []) {
      assert.ok(binding.HostIp === "127.0.0.1" || binding.HostIp === "::1", "Actual published service address must be loopback"); count++;
    }
    assert.ok(count > 0, "Service binding must be present");
  }
}
function checkPublishedPorts() {
  const ports = execFileSync("docker", ["inspect", `supabase_db_${localProjectId}`, `supabase_kong_${localProjectId}`, "--format", "{{json .NetworkSettings.Ports}}"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split(/\r?\n/).map((line) => JSON.parse(line));
  verifyPublishedPorts(ports);
  return ports;
}
export function startupDiagnostics(output) {
  const migrations = [...output.matchAll(/Applying migration ([0-9]{14}_[a-z0-9_]+\.sql)/g)];
  return { last_migration: migrations.at(-1)?.[1] ?? null, sqlstates: [...new Set([...output.matchAll(/SQLSTATE ([A-Z0-9]{5})\b/g)].map((match) => match[1]))] };
}
export function assertLocalDockerEndpoint(endpoint) {
  assert.ok(typeof endpoint === "string" && (endpoint.startsWith("npipe:////./pipe/") || endpoint.startsWith("unix:///")), "Disposable DB requires a local Docker socket, never TCP/SSH Docker hosts");
}
function assertLocalDocker() {
  if (process.env.DOCKER_HOST) assertLocalDockerEndpoint(process.env.DOCKER_HOST);
  const contexts = JSON.parse(execFileSync("docker", ["context", "inspect"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  assertLocalDockerEndpoint(contexts[0]?.Endpoints?.docker?.Host);
}
export function verifyLocalNetwork(network) {
  assert.equal(network.Name, localNetworkId);
  assert.equal(network.Driver, "bridge");
  assert.equal(network.Labels?.["travel-planner.disposable"], "true");
  assert.equal(network.Options?.["com.docker.network.bridge.host_binding_ipv4"], "127.0.0.1", "Local services must bind loopback only");
}
function ensureLocalNetwork() {
  let inspected;
  try { inspected = execFileSync("docker", ["network", "inspect", localNetworkId], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
  catch {
    execFileSync("docker", ["network", "create", "--driver", "bridge", "--label", "travel-planner.disposable=true", "--opt", "com.docker.network.bridge.host_binding_ipv4=127.0.0.1", localNetworkId], { stdio: "ignore" });
    inspected = execFileSync("docker", ["network", "inspect", localNetworkId], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  }
  verifyLocalNetwork(JSON.parse(inspected)[0]);
}
export function assertLocalProject(workspace) {
  const base = realpathSync(workspace), config = realpathSync(resolve(base, "supabase/config.toml"));
  assert.ok(config.startsWith(resolve(base, "supabase") + sep), "Config must stay inside workspace supabase directory");
  const text = readFileSync(config, "utf8");
  assert.match(text, /^project_id\s*=\s*"travel-planner-disposable-local"\s*$/m, "Unexpected local project identity");
  assert.ok(!existsSync(resolve(base, "supabase/.temp/project-ref")), "Linked projects cannot use disposable DB commands");
  const branch = resolve(base, "supabase/.branches/_current_branch");
  if (existsSync(branch)) assert.equal(readFileSync(branch, "utf8").trim(), "main", "Named branches cannot use disposable DB commands");
  return base;
}

export function localCommand(action) {
  const commands = {
    start: ["start", "--debug", "--exclude", "realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor"],
    stop: ["stop"],
    reset: ["db", "reset", "--local"],
    test: ["test", "db"],
  };
  assert.ok(Object.hasOwn(commands, action), "Only start, stop, reset or test are allowed; no remote flags");
  return commands[action];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, "Exactly one local action is required");
  const action = process.argv[2], args = localCommand(action);
  assertLocalProject(root);
  assertLocalDocker();
  ensureLocalNetwork();
  if (action === "test") checkPublishedPorts();
  const env = { ...process.env };
  for (const key of ["SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_PASSWORD", "SUPABASE_PROJECT_ID", "DATABASE_URL", "SUPABASE_WORKDIR"]) delete env[key];
  if (process.platform === "win32") prepareWindowsDockerAdapter(root, env);
  mkdirSync(resolve(root, ".tools"), { recursive: true });
  const privateLog = action === "start" || action === "stop" ? createWriteStream(resolve(root, `.tools/supabase-${action}.log`)) : undefined;
  const child = spawn(process.execPath, [resolve(root, "node_modules/supabase/dist/supabase.js"), ...args, "--network-id", localNetworkId], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => {
    privateLog?.write(chunk);
    if (action === "test" || action === "reset") process.stdout.write(chunk);
  });
  child.on("error", () => { console.error("Local Supabase CLI could not start"); process.exitCode = 1; });
  child.on("close", (code) => {
    let result = code ?? 1;
    if ((action === "start" || action === "reset") && result === 0) {
      try { writeFileSync(resolve(root, ".tools/supabase-published-ports.json"), JSON.stringify(checkPublishedPorts(), null, 2)); }
      catch {
        execFileSync(process.execPath, [resolve(root, "node_modules/supabase/dist/supabase.js"), ...localCommand("stop"), "--network-id", localNetworkId], { cwd: root, env, stdio: "ignore" });
        console.error("Local service port verification failed; project stack stopped."); result = 1;
      }
    }
    if (action === "start" || action === "stop") {
      privateLog.end(() => {
        if (code !== 0) console.error("Local CLI diagnostic:", JSON.stringify(startupDiagnostics(readFileSync(resolve(root, `.tools/supabase-${action}.log`), "utf8"))));
      });
      console.log(`Local Supabase ${action}: exit ${result}. Generated local credentials stay in ignored .tools output.`);
    }
    process.exitCode = result;
  });
}
