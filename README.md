# Vietnam Playful Travel Planner — Agent Planning Pack

Master planning package v1.0 (2026-10-21).

## Contents

- `AGENTS.md` — Mandatory rules for the Coding Agent, debugging, gates and reporting.
- `docs/MASTER_PLANNER.md` — Detailed PRD, architecture, data model, API contract, deterministic itinerary algorithm, acceptance, test strategy, phases and risk register.
- `docs/WORK_ITEMS.md` — Checkable work breakdown by phase with dependencies and acceptance gates.
- `docs/EXECUTION_REPORT_TEMPLATE.md` — Auditable task reporting format.



## Current state (2026-10-21)

G0 PASS after explicit user confirmation of the [review packet](docs/phase-00/G0_REVIEW.md). Added 30 [Đà Lạt drafts](docs/content/da-lat/places.seed.json) alongside 30 Nha Trang drafts, with separate source/licensing evidence and offline validators. Each trip remains one city ([ADR-0013](docs/adr/ADR-0013.md)).

P01-01 provides a Next.js/Tailwind/shadcn scaffold and separate destination skeletons. The vulnerable lint dependency chain has been patched without disabling rules; **full npm audit0**. **P01-01 BLOCKED / G1 FAIL** still applies because ESLint9 is EOL and upstream lint peers do not support10. Remaining baseline/CI tasks have not started. [Security correction](docs/reports/P01-01-FIX.md).

The explicitly requested local preview adds optional Three.js postcard scenes, GSAP reveal and Motion controls, using installed GSAP and authored Three.js/Motion Design skills. Open [local demo](http://127.0.0.1:3392/) and select **B?t 3D**; switch Bi?n xanh/??i th?ng or stop with T?t 3D. SVG/text/navigation remain usable without JS/WebGL and with reduced motion. This is a scaffold; planner/cloud/share and published catalogs are not implemented.

Local production preview (Node24/npm11; Windows uses npm.cmd):

```text
npm.cmd ci
npm.cmd run build
npm.cmd run start -- --port 3392
```

Local checks: typecheck, lint, ten unit regression tests, 11 HTTP checks, five content validators and 12 desktop/mobile browser tests PASS. Lighthouse mobile simulated performance: landing97, Nha Trang99, ?? L?t99; accessibility/best-practices100, CLS0. Active3D sample27.6fps on this machine's RTX4060, ceiling30fps. Landing LCP2.566s in one local run; these results do not approve G7 or replace real-device testing. [Report, conditions, screenshots and raw evidence](docs/reports/P01-05.md). No deployment or later phase progression.

- [Tracker](docs/WORK_ITEMS.md), [scope/acceptance mappings](docs/phase-00/PRD_BASELINE.md), [decision register](docs/phase-00/DECISION_REGISTER.md).
- [Policy checklist](docs/phase-00/POLICY_CHECKLIST.md), [content/rights evidence](docs/content/RIGHTS.md).
- [Execution reports](docs/reports/P00-01.md) (one file per P00 task) and exact logs in `docs/reports/evidence/`.

Offline verification (Node.js built-ins; no package installation):

```text
node scripts/verify-p00-01.mjs
node scripts/verify-p00-02.mjs
node scripts/verify-p00-03.mjs
node scripts/verify-p00-04.mjs
node scripts/verify-p00-05.mjs
```

`python scripts/build-editorial-seed.py` rebuilds Nha Trang and six original symbolic SVGs; `python scripts/build-da-lat-seed.py` rebuilds Đà Lạt. Both read minimized licensed snapshots offline. Do not run research acquisition scripts as CI/application dependencies. Records have unknown hours and source-only coordinate review; these are not published/verified visit recommendations. Supabase tests are NOT RUN: no DB changes/local project yet.
