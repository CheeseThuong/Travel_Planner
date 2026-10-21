import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const schema = JSON.parse(read('docs/content/da-lat/places.seed.schema.json'));
const seed = JSON.parse(read('docs/content/da-lat/places.seed.json'));
const snapshot = JSON.parse(read('docs/content/da-lat/osm-selected.json'));

// Small offline validator for exactly the declarative keyword subset used by
// this documentation schema. Unknown keywords fail closed; this is not a
// general JSON Schema implementation or a substitute for P01 Zod contracts.
const supported = new Set(['$schema','title','type','additionalProperties','required','properties','enum','minLength','pattern','minimum','maximum','items','minItems','maxItems']);
function validate(value, rule, path = '$') {
  for (const key of Object.keys(rule)) assert.ok(supported.has(key), `Unsupported schema keyword ${key} at ${path}`);
  if (rule.enum) assert.ok(rule.enum.some((item) => Object.is(item, value)), `${path}: enum`);
  if (rule.type) {
    const matches = {object: value !== null && typeof value === 'object' && !Array.isArray(value), array: Array.isArray(value), string: typeof value === 'string', number: typeof value === 'number' && Number.isFinite(value), integer: Number.isInteger(value), null: value === null};
    assert.ok(matches[rule.type], `${path}: expected ${rule.type}`);
  }
  if (typeof value === 'string') {
    if (rule.minLength !== undefined) assert.ok([...value].length >= rule.minLength, `${path}: minLength`);
    if (rule.pattern !== undefined) assert.ok(new RegExp(rule.pattern).test(value), `${path}: pattern`);
  }
  if (typeof value === 'number') {
    if (rule.minimum !== undefined) assert.ok(value >= rule.minimum, `${path}: minimum`);
    if (rule.maximum !== undefined) assert.ok(value <= rule.maximum, `${path}: maximum`);
  }
  if (Array.isArray(value)) {
    if (rule.minItems !== undefined) assert.ok(value.length >= rule.minItems, `${path}: minItems`);
    if (rule.maxItems !== undefined) assert.ok(value.length <= rule.maxItems, `${path}: maxItems`);
    if (rule.items) value.forEach((item, index) => validate(item, rule.items, `${path}[${index}]`));
  } else if (value !== null && typeof value === 'object') {
    for (const key of rule.required ?? []) assert.ok(Object.hasOwn(value, key), `${path}: missing ${key}`);
    for (const [key, child] of Object.entries(value)) {
      if (rule.additionalProperties === false) assert.ok(Object.hasOwn(rule.properties ?? {}, key), `${path}: unexpected ${key}`);
      if (rule.properties?.[key]) validate(child, rule.properties[key], `${path}.${key}`);
    }
  }
}
function verify(catalog) {
  validate(catalog, schema);
  const nhaTrang = JSON.parse(read('docs/content/places.seed.json'));
  const otherIds = new Set(nhaTrang.records.map((row) => row.id));
  const slugs = new Set(), ids = new Set(), sources = new Set();
  for (const record of catalog.records) {
    assert.ok(!slugs.has(record.slug), 'duplicate slug'); slugs.add(record.slug);
    assert.ok(!ids.has(record.id), 'duplicate UUID'); ids.add(record.id);
    assert.ok(!otherIds.has(record.id), 'cross-city identity contamination');
    const src = record.data_source;
    assert.equal(record.coordinate_quality, src.object_type === 'node' ? 'community_point' : 'geometry_center_not_entrance');
    assert.equal(record.transport_constraint, 'access_unverified');
    assert.ok(record.caution_notes.some((note) => note.includes('chưa được xác minh')), 'missing access uncertainty');
    const key = `${src.object_type}/${src.object_id}`;
    assert.ok(!sources.has(key), 'duplicate source identity'); sources.add(key);
    assert.equal(src.url, `https://www.openstreetmap.org/${key}`);
    const original = snapshot.elements.find((row) => row.type === src.object_type && row.id === src.object_id);
    assert.ok(original, `${key}: source evidence missing`);
    assert.equal(original.version, src.version);
    const location = original.center ?? original;
    assert.equal(record.lat, location.lat); assert.equal(record.lng, location.lon);
    assert.equal(src.retrieved_on, snapshot.retrieved_on);
    assert.equal(record.content_checked_at, snapshot.retrieved_on);
    assert.ok(record.lat >= 11.80 && record.lat <= 12.10 && record.lng >= 108.25 && record.lng <= 108.60, 'outside acquisition envelope');
    assert.ok(existsSync(resolve(root, record.image.path)), 'missing original illustration');
    assert.ok(existsSync(resolve(root, record.image.rights_evidence)), 'missing rights evidence');
    const svg = read(record.image.path);
    assert.ok(svg.includes('<svg') && svg.includes('<title') && svg.includes('<desc'), 'SVG accessible metadata');
    assert.ok(!/<(?:script|foreignObject|image)\b|(?:href|url)\s*[=(]/i.test(svg), 'SVG external/active content');
    assert.equal(record.hours_checked_at, null);
  }
}
verify(seed);
console.log(`PASS: ${seed.records.length} real-source draft records validate schema subset, unique IDs/slugs/source identities, exact source coordinates/versions, rights files, hours uncertainty and safe original SVG metadata`);
const cases = [
  ['wrong city', (s) => { s.destination_slug = 'nha-trang'; }],
  ['wrong snapshot', (s) => { s.records[0].data_source.snapshot = 'docs/content/sources/osm-selected.json'; }],
  ['cross-city source', (s) => { s.records[0] = JSON.parse(read('docs/content/places.seed.json')).records[0]; }],
  ['false entrance accuracy', (s) => { s.records[0].coordinate_quality = 'community_point'; }],
  ['missing access uncertainty', (s) => { s.records[0].caution_notes = ['Đã xác minh quyền vào.']; }],
  ['missing image rights', (s) => { delete s.records[0].image.rights_evidence; }],
  ['invalid latitude', (s) => { s.records[0].lat = 91; }],
  ['invalid longitude', (s) => { s.records[0].lng = 181; }],
  ['short duration', (s) => { s.records[0].recommended_duration_min = 14; }],
  ['false hours verification', (s) => { s.records[0].hours_checked_at = '2026-10-21'; }],
  ['duplicate identity', (s) => { s.records[1] = structuredClone(s.records[0]); }],
  ['Google source substitution', (s) => { s.records[0].data_source.provider = 'google'; }],
  ['image traversal', (s) => { s.records[0].image.path = '../../secret.svg'; }],
  ['invented coordinates', (s) => { s.records[0].lat += 0.001; }],
  ['fake version', (s) => { s.records[0].data_source.version += 1; }],
  ['too few records', (s) => { s.records.pop(); }],
  ['unexpected source content', (s) => { s.records[0].google_response = {}; }],
  ['premature publication', (s) => { s.records[0].status = 'published'; }]
];
for (const [label, mutate] of cases) {
  const changed = structuredClone(seed); mutate(changed);
  assert.throws(() => verify(changed), undefined, `${label} must be rejected`);
  console.log(`PASS: rejects ${label}`);
}
assert.throws(() => validate(seed, {...schema, unsupportedKeyword: true}), /Unsupported schema keyword/);
console.log('PASS: unsupported schema keywords fail closed');
console.log('P00-05 content-design validation PASS. Drafts are NOT verified opening hours, entrances, live routes or publication approval.');

assert.equal(snapshot.elements.length, seed.records.length, 'retain only selected objects');
for (const row of snapshot.elements) {
  for (const key of Object.keys(row)) assert.ok(['type','id','version','timestamp','lat','lon','center','source_name','source_category'].includes(key), `prohibited snapshot field ${key}`);
  assert.ok(row.source_name.length >= 3);
  for (const key of Object.keys(row.source_category)) assert.ok(['tourism','amenity','leisure'].includes(key));
}
assert.ok(snapshot.query.includes('(11.80,108.25,12.10,108.60)'));
assert.equal(snapshot.license, 'ODbL-1.0');
assert.equal(snapshot.attribution, '© OpenStreetMap contributors');
console.log('PASS: minimized selected source fields, bounded acquisition evidence and destination separation');
