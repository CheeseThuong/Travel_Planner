# Vietnam Playful Travel Planner — Agent Planning Pack

Master planning package v1.0 (2026-10-21).

## Contents

- `AGENTS.md` — Mandatory rules for the Coding Agent, debugging, gates and reporting.
- `docs/MASTER_PLANNER.md` — Detailed PRD, architecture, data model, API contract, deterministic itinerary algorithm, acceptance, test strategy, phases and risk register.
- `docs/WORK_ITEMS.md` — Checkable work breakdown by phase with dependencies and acceptance gates.
- `docs/EXECUTION_REPORT_TEMPLATE.md` — Auditable task reporting format.



## Current state (2026-10-22)

G0 PASS. The ESLint support blocker is corrected using maintained core10 and explicit project compatibility adapters; original lint checks remain enabled. P01-02..04 foundations are implemented; actual GitHub CI run39611614744 PASS for b91d1a8, G1 PASS. See [tracker](docs/WORK_ITEMS.md) and [baseline evidence](docs/reports/P01-BASELINE.md).

P02-01 catalog database is verified on actual Ubuntu CI: local Supabase start, clean reset and42 pgTAP checks twice, then cleanup PASS. Both cities retain30 original draft records with full provenance. Windows baseline also PASS on0a2df28. See [database report](docs/reports/P02-01.md) and [local DB commands](docs/LOCAL_DATABASE.md). Windows host DB startup is still pending an image download; G2 is not complete and no owner/cloud-save behavior is implemented.

Both city pages now have optional procedural Three.js scenes: sea/ripples/boat/clouds for Nha Trang, lake/pines/hills/clouds for Đà Lạt. Use **Bật 3D**, **Xoay ngắm khung cảnh**, **Dừng xoay khung cảnh**, **Tắt 3D**. Scenes remain symbolic illustrations; SVG/text work without JavaScript/WebGL and respect reduced motion. Catalog, wizard, planner, local/cloud save and sharing are still unimplemented pending their gates; this preview is not a working travel-planning journey.

Local demo (Node24/npm11, Windows):

```powershell
$env:NEXT_TELEMETRY_DISABLED='1'
npm.cmd ci --strict-peer-deps
npm.cmd run build
npm.cmd run start -- --port 3000
```

Stop the dev server before production build/gate checks. The type-generation preparation clears only validated stale generated dev types; TypeScript remains strict. `npm.cmd run dev` starts development at loopback3000. The only implemented API is `/api/v1/health`, reporting liveness without backend readiness claims.

Latest CI verification:26 tooling tests +18 Vitest/component/server/boundary tests,16 desktop/mobile demo cases PASS; HTTP smoke includes health. The72 typography cases passed locally in P01. Coverage100% currently covers only the two small runtime foundation modules, not a planner. [Tests](docs/TEST_RESULTS.md), [3D report](docs/reports/P01-06.md), [limitations](docs/KNOWN_LIMITATIONS.md). No production deployment or live Google/staging database claims.

Offline verification (Node.js built-ins; no package installation):

```text
node scripts/verify-p00-01.mjs
node scripts/verify-p00-02.mjs
node scripts/verify-p00-03.mjs
node scripts/verify-p00-04.mjs
node scripts/verify-p00-05.mjs
```

`python scripts/build-editorial-seed.py` rebuilds Nha Trang and six original symbolic SVGs; `python scripts/build-da-lat-seed.py` rebuilds Đà Lạt. Both read minimized licensed snapshots offline. Do not run research acquisition scripts as CI/application dependencies. Records have unknown hours and source-only coordinate review; these are not published/verified visit recommendations. `node scripts/build-catalog-db-seed.mjs --check` verifies the deterministic SQL seed; actual catalog database tests are recorded in P02-01.
