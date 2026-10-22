import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const catalogDestinations = [
  { id: "a7100000-0000-4000-8000-000000000001", slug: "nha-trang", name_vi: "Nha Trang", name_en: "Nha Trang", lat: 12.2451, lng: 109.1943, source: "docs/content/places.seed.json" },
  { id: "a7100000-0000-4000-8000-000000000002", slug: "da-lat", name_vi: "Đà Lạt", name_en: "Da Lat", lat: 11.9404, lng: 108.4583, source: "docs/content/da-lat/places.seed.json" },
];
export const sqlLiteral = (value) => "'" + String(value).replaceAll("'", "''") + "'";

export function buildCatalogSeed() {
  const ids = new Set();
  const output = ["-- Generated offline by scripts/build-catalog-db-seed.mjs. Do not edit.", "-- All records stay draft. Full source records and ODbL attribution are retained.", "begin;"];
  for (const city of catalogDestinations) {
    const data = JSON.parse(readFileSync(resolve(root, city.source), "utf8"));
    assert.equal(data.destination_slug, city.slug);
    assert.equal(data.database_license, "ODbL-1.0");
    assert.equal(data.records.length, 30);
    for (const record of data.records) {
      assert.equal(record.status, "draft");
      assert.equal(record.hours_state, "hours_unknown");
      assert.equal(record.editorial_hours, null);
      assert.ok(!ids.has(record.id), "Duplicate place UUID across destinations"); ids.add(record.id);
    }
    output.push(`insert into public.destinations (id,slug,name_vi,name_en,timezone,center_lat,center_lng,status,database_license,attribution)
values (${[city.id, city.slug, city.name_vi, city.name_en, "Asia/Ho_Chi_Minh"].map(sqlLiteral).join(",")},${city.lat},${city.lng},'draft',${sqlLiteral(data.database_license)},${sqlLiteral(data.attribution)}) on conflict (id) do nothing;`);
    output.push(`insert into public.places (id,destination_id,slug,title_vi,category,description_vi,lat,lng,recommended_duration_min,visit_priority,hours_json,hours_source,hours_checked_at,image_key,content_license,status,editorial_metadata)
select (r->>'id')::uuid,${sqlLiteral(city.id)}::uuid,r->>'slug',r->>'title_vi',r->>'category',r->>'description_vi',
 (r->>'lat')::numeric,(r->>'lng')::numeric,(r->>'recommended_duration_min')::integer,(r->>'visit_priority')::integer,
 null,null,null,r->'image'->>'path',r->'data_source'->>'license','draft',r
from jsonb_array_elements(${sqlLiteral(JSON.stringify(data.records))}::jsonb) r
on conflict (id) do nothing;`);
  }
  output.push("commit;", "");
  return output.join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.length <= 3 && (!process.argv[2] || process.argv[2] === "--check"), "Only --check is supported");
  const target = resolve(root, "supabase/seed.sql"), expected = buildCatalogSeed();
  if (process.argv[2] === "--check") assert.equal(readFileSync(target, "utf8").replaceAll("\r\n", "\n"), expected, "Regenerate catalog SQL seed");
  else writeFileSync(target, expected);
  console.log("Catalog DB seed: 60 original draft records, two destinations, metadata retained.");
}
