# Vietnam Playful Travel Planner — Agent Planning Pack

Master planning package v1.0 (2026-10-21).

## Contents

- `AGENTS.md` — Mandatory rules for the Coding Agent, debugging, gates and reporting.
- `docs/MASTER_PLANNER.md` — Detailed PRD, architecture, data model, API contract, deterministic itinerary algorithm, acceptance, test strategy, phases and risk register.
- `docs/WORK_ITEMS.md` — Checkable work breakdown by phase with dependencies and acceptance gates.
- `docs/EXECUTION_REPORT_TEMPLATE.md` — Auditable task reporting format.



## Current state (2026-10-21)

Phase 00 technical/content design tasks P00-01..04 have reports and passing document/content checks. G0 remains NOT VERIFIED pending acceptance of the [review packet](docs/phase-00/G0_REVIEW.md), including the ODbL catalog strategy. Phase 01 has not started; no application, packages or deployment exist.

- [Tracker](docs/WORK_ITEMS.md), [scope/acceptance mappings](docs/phase-00/PRD_BASELINE.md), [decision register](docs/phase-00/DECISION_REGISTER.md).
- [Policy checklist](docs/phase-00/POLICY_CHECKLIST.md), [content/rights evidence](docs/content/RIGHTS.md).
- [Execution reports](docs/reports/P00-01.md) (one file per P00 task) and exact logs in `docs/reports/evidence/`.

Offline verification (Node.js built-ins; no package installation):

```text
node scripts/verify-p00-01.mjs
node scripts/verify-p00-02.mjs
node scripts/verify-p00-03.mjs
node scripts/verify-p00-04.mjs
```

`python scripts/build-editorial-seed.py` rebuilds the 30-record draft catalog and six original symbolic SVGs from the minimized licensed snapshot without network. Do not run research acquisition scripts as CI/application dependencies. Records have unknown hours and source-only coordinate review; these are not published/verified visit recommendations. Runtime npm/Supabase checks are NOT RUN because scaffold/database setup belongs to later phases.
