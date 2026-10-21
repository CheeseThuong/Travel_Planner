import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const text = readFileSync(resolve(root, 'docs/phase-00/POLICY_CHECKLIST.md'), 'utf8');
for (let n = 1; n <= 7; n++) {
  const id = `POL-${String(n).padStart(2, '0')}`;
  assert.match(text, new RegExp(`^- \\[x\\] ${id}:.*REVIEWED by Codex 2026-10-21`, 'm'));
  console.log(`PASS: ${id} technical review attribution and date`);
}
for (const host of ['developers.google.com/maps/documentation/places/web-service/policies','developers.google.com/maps/documentation/routes/policies','cloud.google.com/maps-platform/terms/maps-service-terms','developers.google.com/maps/documentation/urls/get-started']) {
  assert.ok(text.includes(`https://${host}`), `Missing source ${host}`);
  console.log(`PASS: policy source present: ${host}`);
}
for (const name of ['PRIVACY_DRAFT.md', 'TERMS_DRAFT.md']) {
  const path = resolve(root, 'docs/phase-00', name);
  assert.ok(existsSync(path));
  assert.ok(readFileSync(path, 'utf8').includes('chưa công bố'));
  console.log(`PASS: ${name} explicitly unpublished`);
}
assert.ok(text.includes('legal approval NOT GIVEN') && text.includes('live providers DISABLED'));
console.log('PASS: technical review scope excludes live/legal approval');
console.log('P00-03 document checks PASS. Source inspection recorded in checklist; runtime compliance and G8 release NOT VERIFIED.');
