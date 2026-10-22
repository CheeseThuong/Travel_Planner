# Vietnam Playful Travel Planner

A playful, itinerary-first travel planner for Vietnam, starting with **Nha Trang** and **Đà Lạt**. The project is built phase by phase against explicit acceptance gates, with every claim backed by recorded evidence.

> **Status: early preview.** The foundations, database layer and two illustrated city pages exist. The catalog, planning wizard, itinerary editor, save and sharing are **not implemented yet**. This build is not a working travel-planning journey.

| | |
|---|---|
| Planning pack | v1.0 (2026-10-21) |
| Last status update | 2026-10-22 |
| Local platform tested | Windows, Node 24 / npm 11 |

---

## Table of contents

1. [Project status](#project-status)
2. [What is and is not implemented](#what-is-and-is-not-implemented)
3. [Quick start](#quick-start)
4. [Optional 3D scenes](#optional-3d-scenes)
5. [Testing and verification](#testing-and-verification)
6. [Data and content seeds](#data-and-content-seeds)
7. [Documentation](#documentation)
8. [Planning pack and agent workflow](#planning-pack-and-agent-workflow)
9. [Known limitations](#known-limitations)

---

## Project status

| Gate / Item | Status | Evidence |
|---|---|---|
| **G0** | PASS | ESLint support blocker corrected using maintained `core10` and explicit project compatibility adapters. The original lint checks remain enabled. |
| **G1** | PASS | P01-02..04 foundations implemented. GitHub CI run `39611614744` passed for commit `b91d1a8`. See [baseline evidence](docs/reports/P01-BASELINE.md). |
| **P02-01 / P02-02** | Verified | Windows local runs and CI run `39711636934`: safe loopback startup, clean reset, 113 pgTAP checks (run twice) and the full baseline all pass. See the [database report](docs/reports/P02-01.md) and [local DB commands](docs/LOCAL_DATABASE.md). |
| **P02-03** | Local PASS, CI pending | 121-case local DB suite and a real two-session anonymous owner A/B integration test pass. They cover party size, VND budget and cost provenance, and an assisted/manual-mode roundtrip. A fresh CI run is pending. See the [owner report](docs/reports/P02-03.md). |
| **G2** | Not complete | No public owner route and no working wizard or editor is claimed. |

Progress is tracked in [`docs/WORK_ITEMS.md`](docs/WORK_ITEMS.md).

## What is and is not implemented

**Implemented**

- Two city pages (Nha Trang, Đà Lạt) with SVG and text content that work without JavaScript or WebGL and respect reduced-motion settings.
- Optional procedural Three.js scenes for both cities (see [Optional 3D scenes](#optional-3d-scenes)).
- A single API endpoint, `GET /api/v1/health`, which reports liveness only and makes no backend-readiness claims.
- Database foundations: local startup, clean reset, pgTAP checks, and anonymous owner integration tests (database level only; no public route).

**Not yet implemented** (pending their gates)

- Catalog experience
- Planning wizard
- Itinerary planner and editor
- Local and cloud save
- Sharing

**Not claimed**

- Production deployment
- Live Google integration or a live staging database

## Quick start

**Requirements:** Node 24, npm 11, Windows (the commands below target PowerShell).

```powershell
$env:NEXT_TELEMETRY_DISABLED='1'
npm.cmd ci --strict-peer-deps
npm.cmd run build
npm.cmd run start -- --port 3000
```

For development, run `npm.cmd run dev`. It starts the dev server on loopback port 3000.

> **Note:** Stop the dev server before running production builds or gate checks. The type-generation preparation step clears only validated, stale generated dev types; TypeScript remains in strict mode.

## Optional 3D scenes

Both city pages include an optional procedural Three.js scene:

- **Nha Trang:** sea, ripples, boat and clouds
- **Đà Lạt:** lake, pines, hills and clouds

Controls (Vietnamese UI labels):

| Label | Action |
|---|---|
| **Bật 3D** | Enable the 3D scene |
| **Xoay ngắm khung cảnh** | Start rotating the view |
| **Dừng xoay khung cảnh** | Stop rotating |
| **Tắt 3D** | Disable the 3D scene |

The scenes are symbolic illustrations, not accurate representations of real places. The page remains fully usable without them. Details are in the [3D report](docs/reports/P01-06.md).

## Testing and verification

**Latest CI verification**

| Suite | Result |
|---|---|
| Tooling tests | 26 passed |
| Vitest component, server and boundary tests | 18 passed |
| Desktop and mobile demo cases | 16 passed |
| HTTP smoke test (includes `/api/v1/health`) | Passed |
| Typography cases (local, P01) | 72 passed |

Code coverage is 100%, but it currently covers only the two small runtime foundation modules, not a planner. See [`docs/TEST_RESULTS.md`](docs/TEST_RESULTS.md) for full results.

**Offline verification** uses Node.js built-ins only, so no package installation is needed:

```text
node scripts/verify-p00-01.mjs
node scripts/verify-p00-02.mjs
node scripts/verify-p00-03.mjs
node scripts/verify-p00-04.mjs
node scripts/verify-p00-05.mjs
```

## Data and content seeds

Seed builders read minimized, licensed snapshots offline:

```text
python scripts/build-editorial-seed.py     # Nha Trang + six original symbolic SVGs
python scripts/build-da-lat-seed.py        # Đà Lạt
node scripts/build-catalog-db-seed.mjs --check   # verify the deterministic SQL seed
```

Actual catalog database tests are recorded in [`docs/reports/P02-01.md`](docs/reports/P02-01.md).

> **Important:**
> - Do not run research acquisition scripts as CI or application dependencies.
> - Catalog records have unknown opening hours and only source-level coordinate review. They are **not** published or verified visit recommendations.

## Documentation

| Document | Purpose |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Mandatory rules for the Coding Agent: debugging, gates and reporting |
| [`docs/MASTER_PLANNER.md`](docs/MASTER_PLANNER.md) | PRD, architecture, data model, API contract, deterministic itinerary algorithm, acceptance criteria, test strategy, phases and risk register |
| [`docs/WORK_ITEMS.md`](docs/WORK_ITEMS.md) | Checkable work breakdown by phase, with dependencies and acceptance gates |
| [`docs/EXECUTION_REPORT_TEMPLATE.md`](docs/EXECUTION_REPORT_TEMPLATE.md) | Auditable task reporting format |
| [`docs/LOCAL_DATABASE.md`](docs/LOCAL_DATABASE.md) | Local database commands |
| [`docs/TEST_RESULTS.md`](docs/TEST_RESULTS.md) | Recorded test results |
| [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) | Known limitations |
| [`docs/reports/`](docs/reports/) | Evidence reports: `P01-BASELINE`, `P01-06`, `P02-01`, `P02-03` |

## Planning pack and agent workflow

This repository is delivered as an **Agent Planning Pack**. Work is executed by a Coding Agent under the rules in [`AGENTS.md`](AGENTS.md):

1. Pick a work item from [`docs/WORK_ITEMS.md`](docs/WORK_ITEMS.md) and respect its dependencies.
2. Implement it against the specification in [`docs/MASTER_PLANNER.md`](docs/MASTER_PLANNER.md).
3. Pass the relevant acceptance gate.
4. Record the outcome using [`docs/EXECUTION_REPORT_TEMPLATE.md`](docs/EXECUTION_REPORT_TEMPLATE.md).

## Known limitations

See [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) for the full list. In short: this is a preview of foundations and illustrated pages, not a usable planner.