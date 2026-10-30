import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== "--contributions-browser")) throw new Error("Unknown local test action");
const project = "travel-planner-disposable-local";
const container = `supabase_db_${project}`;
const network = "travel-planner-disposable-loopback";
const marker = `p0203-${randomUUID()}`;
const run = (command, args, options = {}) => execFileSync(command, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });

const networks = JSON.parse(run("docker", ["inspect", container, "--format", "{{json .NetworkSettings.Networks}}"]));
if (!networks[network]) throw new Error("Local Auth test refused an unowned database container");
const networkLabel = run("docker", ["network", "inspect", network, "--format", "{{index .Labels \"travel-planner.disposable\"}}"]).trim();
if (networkLabel !== "true") throw new Error("Local Auth test refused an unowned Docker network");

const cli = path.join(root, "node_modules", "supabase", "dist", "supabase.js");
const status = JSON.parse(run(process.execPath, [cli, "status", "--output", "json"]));
const apiUrl = status.API_URL;
const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
if (typeof apiUrl !== "string" || typeof publishableKey !== "string" || !/^http:\/\/(127\.0\.0\.1|localhost):35321$/.test(apiUrl)) throw new Error("Unexpected local Supabase status");

const sql = (statement) => run("docker", ["exec", container, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres", "-c", statement]);
let exitCode = 1;
try {
  sql("update public.destinations set status='published'; update public.places set status='published';");
  const moderatorResponse = await fetch(new URL("/auth/v1/signup", apiUrl), { method: "POST", headers: { apikey: publishableKey, "Content-Type": "application/json" }, body: JSON.stringify({ data: { test_marker: marker, fixture_kind: "contribution_moderator" } }) });
  if (!moderatorResponse.ok) throw new Error("Disposable moderator session creation failed");
  const moderator = await moderatorResponse.json();
  if (typeof moderator.access_token !== "string") throw new Error("Disposable moderator session missing");
  sql(`insert into contribution_private.moderators(user_id) select id from auth.users where raw_user_meta_data->>'test_marker'='${marker}' and raw_user_meta_data->>'fixture_kind'='contribution_moderator';`);
  const testEnv = { ...process.env, LOCAL_SUPABASE_URL: apiUrl, LOCAL_SUPABASE_PUBLISHABLE_KEY: publishableKey, LOCAL_AUTH_TEST_MARKER: marker, LOCAL_CONTRIBUTION_MODERATOR_TOKEN: moderator.access_token };
  const result = spawnSync(process.execPath, [path.join(root, "node_modules", "vitest", "vitest.mjs"), "run", "--config", "vitest.auth.config.mts"], {
    cwd: root,
    env: testEnv,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  exitCode = result.status ?? 1;
  if (exitCode === 0 && process.argv[2] === "--contributions-browser") {
    const browser = spawnSync(process.execPath, [path.join(root, "node_modules", "@playwright", "test", "cli.js"), "test", "--config", "playwright.contributions.config.mjs"], { cwd: root, env: testEnv, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    process.stdout.write(browser.stdout ?? ""); process.stderr.write(browser.stderr ?? ""); exitCode = browser.status ?? 1;
  }
} finally {
  const safeMarker = marker.replaceAll("'", "''");
  sql(`delete from auth.users where raw_user_meta_data->>'test_marker'='${safeMarker}'; update public.destinations set status='draft'; update public.places set status='draft';
    do $cleanup$ begin
      if exists(select 1 from auth.users where raw_user_meta_data->>'test_marker'='${safeMarker}')
        or exists(select 1 from public.destinations where status<>'draft') or exists(select 1 from public.places where status<>'draft') then
        raise exception 'Local Auth fixture cleanup failed';
      end if;
    end $cleanup$;`);
}
if (exitCode !== 0) process.exit(exitCode);
console.log("Local Auth owner/planning integration PASS; disposable sessions exercised and cleaned without logging credentials.");
