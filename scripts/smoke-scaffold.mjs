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
  cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
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
    ["/", 200, "Chuyến đi nhỏ."],
    ["/destinations/nha-trang", 200, "Nha Trang"],
    ["/destinations/da-lat", 200, "Đà Lạt"],
    ["/destinations/unsupported-city", 404, "Chưa tìm thấy nơi này."],
    ["/plan/new", 200, "Lên kế hoạch theo cách của bạn"],
    ["/trips/not-an-owner-credential", 200, "Không gian chuyến đi"],
    ["/open", 200, "Mở lại một kỷ niệm"],
    ["/shared", 200, "Cùng xem một hành trình"],
    ["/privacy", 200, "Quyền riêng tư"],
    ["/terms", 200, "Điều khoản sử dụng"],
    ["/missing-route", 404, "Chưa tìm thấy nơi này."],
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
  const health = await fetch(`http://127.0.0.1:${port}/api/v1/health`, { headers: { "x-request-id": requestId } });
  assert.equal(health.status, 200); assert.equal(health.headers.get("x-request-id"), requestId);
  assert.deepEqual(await health.json(), { data: { status: "ok" }, meta: { request_id: requestId } });
  console.log("PASS: /api/v1/health: real HTTP status/envelope/UUID, no backend details");
  console.log("Scaffold HTTP smoke PASS. Cloud ownership, itinerary, save or share implementation is not verified.");
} finally {
  if (child.exitCode === null) {
    const exited = once(child, "exit");
    child.kill();
    await exited;
  }
}
