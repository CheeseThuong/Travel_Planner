import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const master = read('docs/MASTER_PLANNER.md');
const baseline = read('docs/phase-00/PRD_BASELINE.md');
const register = read('docs/phase-00/DECISION_REGISTER.md');
const agents = read('AGENTS.md');
let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
  console.log(`PASS: ${message}`);
}
const expected = [...master.matchAll(/^\| (FR-\d{3}) \|/gm), ...master.matchAll(/^- (BR-\d{2}):/gm)].map((m) => m[1]);
const rows = [...baseline.matchAll(/^\| ((?:FR-\d{3}|BR-\d{2})) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|/gm)];
check(expected.length === 32, 'Master declares 17 FR and 15 BR including ADR0022 amendment');
check(rows.length === expected.length, 'Traceability has exactly 32 rows');
for (const id of expected) {
  const matching = rows.filter((row) => row[1] === id);
  check(matching.length === 1, `${id} appears exactly once`);
  const row = matching[0];
  check(row[2].trim().length > 0 && row[5].trim().length > 0, `${id} has owner and observable expectation`);
  const acceptances = [...row[3].matchAll(/(?:AC|BASE)-\d{3}/g)].map((m) => m[0]);
  check(acceptances.length > 0, `${id} has acceptance IDs`);
  for (const id of acceptances) {
    check(new RegExp(`^- ${id}(?:[: —])`, 'm').test(id.startsWith('BASE-') ? baseline : master), `${id} is defined`);
  }
  check(/P\d{2}-\d{2}/.test(row[4]), `${id} has verification task`);
}
for (const id of ['GOV-001','SCOPE-001','API-001','API-002','ENGINE-001','COST-001','MAP-001','HOTEL-001','ACCOUNT-001','RIGHTS-001','POLICY-001']) {
  check(new RegExp(`^\\| ${id} \\| [^|]+ \\| [^|]+ \\| [^|]+ \\| [^|]+ \\|`, 'm').test(register), `${id} has source, owner, proposal and state`);
}
for (const path of ['docs/phase-00/PRD_BASELINE.md','docs/phase-00/DECISION_REGISTER.md','docs/adr/ADR-0000.md']) {
  for (const link of read(path).matchAll(/\]\(([^)]+\.md)\)/g)) {
    check(existsSync(resolve(root, dirname(path), link[1])), `${path}: local link ${link[1]} exists`);
  }
}
check(agents.includes('all task acceptance criteria and applicable tests pass with evidence'), 'Task completion requires evidence');
check(agents.includes('DO NOT move to a later phase while its blocking Gate is FAIL or NOT VERIFIED'), 'Phase gate prohibition preserved');
check(master.includes('chỉ chuyển phase khi gate hiện tại PASS'), 'Master agrees with approved governance clarification');
console.log(`${checks} document checks PASS. Runtime behavior and G0 approval are NOT VERIFIED.`);
