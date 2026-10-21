import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const directory = resolve(".next/static/chunks");
const totals = { js: { files: 0, bytes: 0, gzipBytes: 0 }, css: { files: 0, bytes: 0, gzipBytes: 0 } };
for (const file of readdirSync(directory, { recursive: true })) {
  const kind = file.endsWith(".js") ? "js" : file.endsWith(".css") ? "css" : undefined;
  if (!kind) continue;
  const content = readFileSync(resolve(directory, file));
  totals[kind].files += 1;
  totals[kind].bytes += content.length;
  totals[kind].gzipBytes += gzipSync(content).length;
}
console.log(JSON.stringify({ scope: "Aggregate all emitted static chunks across every route; NOT initial route payload or a Lighthouse measurement", totals }, null, 2));
