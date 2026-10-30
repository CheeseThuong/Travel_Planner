// P01-01 production HTTP smoke; no browser or later-phase API behavior claimed.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reservation = createServer();
reservation.listen(0, "127.0.0.1");
await once(reservation, "listening");
const port = reservation.address().port;
await new Promise((done, reject) => reservation.close((error) => error ? reject(error) : done()));
const child = spawn(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", DEPLOYMENT_ENV: "local", CLOUD_ENABLED: "false", DOC_WEATHER_ENABLED: "false", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", GOOGLE_MAPS_LIVE_ENABLED: "false", BRAVE_ENABLED: "false", GROQ_ENABLED: "false", GROQ_MODEL: "" },
});
let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });
try {
  const deadline = Date.now() + 30000;
  while (!output.includes("Ready")) {
    assert.equal(child.exitCode, null, `Owned Next process exited: ${output}`);
    assert.ok(Date.now() < deadline, `Server readiness timeout: ${output}`);
    await new Promise((done) => setTimeout(done, 100));
  }
  const pages = [
    ["/", 200, "Đi đâu,"],
    ["/destinations/nha-trang", 200, "Nha Trang"],
    ["/destinations/da-lat", 200, "Đà Lạt"],
    ["/destinations/unsupported-city", 404, "KHÔNG TÌM THẤY / 404"],
    ["/plan/new", 200, "Tuyến đường"],
    ["/contribute", 200, "Đóng góp địa điểm"],
    ["/plans", 200, "Những chuyến đi"],
    ["/cam-hung/da-lat", 200, "Đà Lạt không chỉ có"],
    ["/cau-chuyen", 200, "Mỗi chuyến đi,"],
    ["/shared", 200, "Tuyến chia sẻ chưa sẵn sàng"],
    ["/privacy", 200, "Quyền riêng tư"],
    ["/terms", 200, "Điều khoản đang hoàn thiện"],
    ["/missing-route", 404, "KHÔNG TÌM THẤY / 404"],
  ];
  for (const [path, status, text] of pages) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, status, `${path}: HTTP status`);
    const body = await response.text();
    assert.ok(body.includes(text), `${path}: expected Vietnamese page text`);
    assert.ok(body.includes('lang="vi"'), `${path}: Vietnamese document language`);
    console.log(`PASS: ${path}: HTTP ${status}, expected content, lang=vi`);
  }
  const requestId = "a6ea84e9-2f58-49d7-87c3-eb5b82ac352e";
  for (const path of ["/trips/not-an-owner-credential", "/open"]) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { redirect: "manual" });
    // App Router may commit the streaming shell before a dynamic-page redirect.
    if (response.status === 307) assert.equal(response.headers.get("location"), "/plans");
    else {
      assert.equal(response.status, 200);
      assert.match(await response.text(), /<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=\/plans"\/>/);
    }
    console.log(`PASS: ${path}: HTTP ${response.status}, redirects to vault`);
  }
  const health = await fetch(`http://127.0.0.1:${port}/api/v1/health`, { headers: { "x-request-id": requestId } });
  assert.equal(health.status, 200); assert.equal(health.headers.get("x-request-id"), requestId);
  assert.deepEqual(await health.json(), { data: { status: "ok" }, meta: { request_id: requestId } });
  console.log("PASS: /api/v1/health: real HTTP status/envelope/UUID, no backend details");
  const capabilities = await fetch(`http://127.0.0.1:${port}/api/v1/doc-status`, { headers: { "x-request-id": requestId } });
  assert.equal(capabilities.status, 200); const snapshot = await capabilities.json();
  assert.equal(snapshot.data.contributions, "disabled"); assert.equal(snapshot.meta.request_id, requestId);
  console.log("PASS: /api/v1/doc-status: disabled cloud capability, request ID");
  for (const [query, expected] of [["", 503], ["?city=__proto__", 400]]) {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/doc-weather${query}`, { headers: { "x-request-id": requestId } });
    assert.equal(response.status, expected); assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await response.json()).meta.request_id, requestId);
    console.log(`PASS: /api/v1/doc-weather${query}: ${expected}, safe error envelope`);
  }
  const discovery = await fetch(`http://127.0.0.1:${port}/api/v1/places/search`, { method: "POST", headers: { "content-type": "application/json", "x-request-id": requestId }, body: JSON.stringify({ destination_slug: "da-lat", query: "cho da lat", category: "shopping", use_provider: false }) });
  assert.equal(discovery.status, 200); assert.equal(discovery.headers.get("cache-control"), "no-store");
  const discovered = await discovery.json();
  assert.equal(discovered.meta.request_id, requestId); assert.equal(discovered.data.provider_requests_attempted, 0);
  assert.ok(discovered.data.items.some((place) => place.title_vi === "Chợ Đà Lạt"));
  assert.ok(discovered.data.items.every((place) => place.destination_slug === "da-lat"));
  console.log("PASS: discovery: real bounded no-provider HTTP search, city separation and request ID");
  const previewDraft = { id: requestId, version: 1, destination_slug: "da-lat", title: "Local smoke preview", timezone: "Asia/Ho_Chi_Minh", start_date: "2026-11-10", end_date: "2026-11-11", arrival_local_time: "10:00", departure_local_time: "17:00", base_location: { label: "Temporary city reference", lat: 11.94, lng: 108.45, temporary: true }, transport_mode: "motorbike", pace: "balanced", party_size: 2, planning_mode: "assisted", budget: { currency: "VND", total_vnd: null, known_costs_vnd: { lodging: 0, transport: 0, meals: 0, other: 0 } }, preferences: { day_start: "08:00", day_end: "21:00", lunch_buffer_minutes: 60, rest_buffer_minutes: 15, return_to_base: true }, stops: [] };
  const preview = await fetch(`http://127.0.0.1:${port}/api/v1/plans/preview`, { method: "POST", headers: { "content-type": "application/json", "x-request-id": requestId }, body: JSON.stringify({ draft: previewDraft, use_ai: true, use_provider: true }) });
  assert.equal(preview.status, 200); const planned = await preview.json(); assert.equal(planned.meta.request_id, requestId); assert.equal(planned.data.preview_only, true); assert.equal(planned.data.requires_confirmation, true); assert.deepEqual(planned.data.original_stop_ids, []); assert.ok(planned.data.suggested_places.length > 0); assert.equal(planned.data.usage.discovery_requests_attempted, 0); assert.equal(planned.data.usage.ranking_requests_attempted, 0); assert.ok(planned.data.warnings.includes("APPROXIMATE_NOT_ROAD_ETA"));
  console.log("PASS: hybrid preview: zero-selection no-key candidate, source/uncertainty and no owner mutation");
  const session = await fetch(`http://127.0.0.1:${port}/api/v1/contributions/session`, { headers: { "x-request-id": requestId } });
  assert.equal(session.status, 401); assert.equal((await session.json()).error.code, "AUTH_REQUIRED");
  console.log("PASS: contributions: missing verified session denied");
  for (const [origin, expectedStatus] of [[`http://127.0.0.1:${port}`, 422], ["https://attacker.invalid", 403]]) {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/contributions`, { method: "POST", headers: { origin, "content-type": "application/json", "idempotency-key": requestId, "x-request-id": requestId }, body: "{}" });
    assert.equal(response.status, expectedStatus); assert.equal(response.headers.get("x-request-id"), requestId);
    console.log(`PASS: contributions: real HTTP origin boundary ->${expectedStatus}`);
  }
  for (const [operation, payload] of [["generate", { expected_version: 1 }], ["apply-plan", { expected_version: 1, plan_run_id: requestId, confirmed: true }]]) {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/trips/${requestId}/${operation}`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": requestId, "x-request-id": requestId }, body: JSON.stringify(payload) });
    assert.equal(response.status, 401, `${operation}: unsigned caller denied`);
    const envelope = await response.json();
    assert.equal(envelope.error.code, "AUTH_REQUIRED"); assert.equal(envelope.meta.request_id, requestId);
    assert.deepEqual(envelope.error.details, {});
    console.log(`PASS: ${operation}: real HTTP ownership boundary and request ID`);
  }
  console.log("Scaffold HTTP smoke PASS. Cloud ownership, itinerary, save or share implementation is not verified.");
} finally {
  if (child.exitCode === null) {
    const exited = once(child, "exit");
    child.kill();
    await exited;
  }
}
