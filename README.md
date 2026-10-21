# Vietnam Playful Travel Planner — Agent Planning Pack

Master planning package v1.0 (2026-10-21).

## Contents

- `AGENTS.md` — Mandatory rules for the Coding Agent, debugging, gates and reporting.
- `docs/MASTER_PLANNER.md` — Detailed PRD, architecture, data model, API contract, deterministic itinerary algorithm, acceptance, test strategy, phases and risk register.
- `docs/WORK_ITEMS.md` — Checkable work breakdown by phase with dependencies and acceptance gates.
- `docs/EXECUTION_REPORT_TEMPLATE.md` — Auditable task reporting format.



## Current state (2026-10-21)

G0 PASS after explicit user confirmation of the [review packet](docs/phase-00/G0_REVIEW.md). Added 30 [Đà Lạt drafts](docs/content/da-lat/places.seed.json) alongside 30 Nha Trang drafts, with separate source/licensing evidence and offline validators. Each trip remains one city ([ADR-0013](docs/adr/ADR-0013.md)).

P01-01 has a local Next.js/Tailwind/shadcn scaffold, original symbolic scenes and destination route skeletons for both cities. Typecheck, lint, production build and 11-route HTTP smoke PASS. **P01-01 BLOCKED / G1 FAIL**: full npm audit reports an unpatched braces dependency chain in Next's lint toolchain; the peer-compatible ESLint9 line is EOL and React lint plugin does not yet accept ESLint10. No checks are disabled, no later dependent task starts, no deployment. [Execution report and exact evidence](docs/reports/P01-01.md).

Local preview requires Node24/npm11. Dependencies are exact-pinned in package-lock.json. Windows PowerShell uses npm.cmd because the machine's script execution policy remains unchanged:

```text
npm.cmd run dev
```

Open the printed local address. This is a scaffold, not a working planner/cloud/share system. Catalog content is still draft and not published to the UI. Unit/integration/Playwright setup is NOT RUN because P01-02 depends on the blocked scaffold task. Do not treat a local HTTP check as mobile/browser/a11y or CI verification.

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
