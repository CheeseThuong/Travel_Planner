import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
for (let number = 1; number <= 10; number++) {
  const path = `docs/adr/ADR-${String(number).padStart(4, '0')}.md`;
  const text = read(path);
  assert.ok(text.includes(`Master ADR-${String(number).padStart(2, '0')}`), `${path} baseline mapping`);
  for (const section of ['Context', 'Decision', 'Alternatives', 'Trade-offs', 'Validation cases']) {
    assert.ok(text.includes(`## ${section}`), `${path} missing ${section}`);
  }
  assert.match(text, /P\d{2}/, `${path} verification milestone`);
  console.log(`PASS: ${path}: baseline mapping, context, decision, alternatives, trade-offs, validation`);
}
const review = read('docs/phase-00/ARCHITECTURE_REVIEW.md');
for (const marker of ['Dependency review','Build constraints','Cost-control strategy','400 elements','no SDK, React or Next','Default external live calls disabled','G0 NOT VERIFIED']) {
  assert.ok(review.includes(marker), `Missing review constraint ${marker}`);
  console.log(`PASS: architecture review: ${marker}`);
}
console.log('P00-02 documentation validation PASS. Runtime architecture, policies, licenses and deployment NOT VERIFIED.');
