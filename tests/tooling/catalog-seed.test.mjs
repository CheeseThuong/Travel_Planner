import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCatalogSeed, catalogDestinations, sqlLiteral } from "../../scripts/build-catalog-db-seed.mjs";

test("database seed retains every exact source record, city and draft boundary", () => {
  const sql = buildCatalogSeed();
  assert.equal(readFileSync("supabase/seed.sql", "utf8").replaceAll("\r\n", "\n"), sql);
  assert.equal(buildCatalogSeed(), sql);
  for (const city of catalogDestinations) {
    const source = JSON.parse(readFileSync(city.source, "utf8"));
    assert.ok(sql.includes(sqlLiteral(JSON.stringify(source.records)) + "::jsonb"));
    assert.ok(sql.includes(sqlLiteral(city.id)));
  }
  assert.ok(!sql.includes("'published'"));
  assert.ok(sql.includes("on conflict (id) do nothing"));
});

test("SQL seed literals escape quotes and retain ordinary backslashes", () => {
  assert.equal(sqlLiteral("Traveler's \\ place"), "'Traveler''s \\ place'");
});
