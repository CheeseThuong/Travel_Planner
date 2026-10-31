# P03-02-CORRECT — Accurate draft inputs

TASK: P03-02-CORRECT
STATUS: DONE
Dependencies: baseline9937e46 and P03-03 a6dd13c DONE; correction within Phase03. G3 NOT VERIFIED.

## Specification before implementation

Root cause: the historical P03-02 task was closed on budget/mode preview tests, while the G3 exit requires an accurate TripDraft. Source lacks arrival/departure, base coordinates, required flags, and exposes only12/30 places. The manual success message claims a plan exists. Resolve the conflict without changing the existing TripDraft contract or implementing a planner.

- AC-D1: strict local-date range1–7 days, real calendar dates/leap days, HH:mm and positive same-day arrival/departure; supported destination timezone; valid independent base label/coordinates with explicit temporary warning.
- AC-D2: expose/search all30 city catalog records; preserve selection order across filters and manual/editorial additions; required controls and explicit removals; no silent drops, maximum30.
- AC-D3: submit constructs and validates the existing TripDraft model in memory and shows a human-readable prepared-input review with explicit unsaved/not-generated status. Changes invalidate stale review. Null budget differs from0; prices/hours/access remain unknown. Manual mode does not optimize.
- AC-D4: unit negative/boundary/regression tests and desktop/mobile journeys; lint, strict typecheck, unit, build, HTTP and E2E pass before commit.

Affected: `src/domain/trip-draft.ts`, wizard, focused unit/browser tests, related import regression expectation, report/tracker/audit and ADR0025 (clarifies calendar validation, no engine behavior). No DB/API/dependency/schema change. Defaults remain visible/editable; no guessed hotel coordinates. Rollback only task hunks; package/lock/user changes remain excluded. Persistence, locks/scheduling and optimization stay behind G3.

## Changes and verification

Exact files: `src/domain/trip-draft.ts`, `src/components/plan-wizard.tsx`, `tests/unit/trip-draft.test.ts`, `tests/demo/draft.spec.mjs`, `tests/demo/wizard.spec.mjs`, `tests/demo/import.spec.mjs`, `docs/adr/ADR-0025.md`, this report, `docs/WORK_ITEMS.md`, `AUDIT.md`.

All30 catalog records are selectable/searchable. One sequence retains catalog/manual selection order; required flags do not reorder. Submit creates the existing TripDraft object and validates it before displaying its dates/edge times/base/ordered stops. Any edit invalidates the review. Empty budget is null,0 is a legitimate zero-spend input. Unknown hours/access/cost remain explicit; no route estimate is invented. Manual mode keeps selections.

| Exact command | Exit | Result / log prefix in `.tools/audit-20261028/` |
|---|---|---|
| `node node_modules/vitest/vitest.mjs run tests/unit/trip-draft.test.ts` before code | 1 | `p03-02-correct-red`, missing feature module |
| same after domain implementation | 0 | `p03-02-correct-domain`,10 tests at that slice |
| `npm.cmd run typecheck` intermediate | 2 | `p03-02-correct-increment`, found obsolete selected references and nullable budget input; all corrected |
| `npm.cmd run typecheck` | 0 | `p03-02-correct-typecheck` |
| `npm.cmd run lint` | 0 | `p03-02-correct-lint` and final rerun after selector correction |
| `npm.cmd run test:unit` | 0 | `p03-02-correct-unit`,31 tooling +62 Vitest |
| `npm.cmd run build` (`NEXT_TELEMETRY_DISABLED=1`) | 0 | `p03-02-correct-build` |
| `npm.cmd run test:integration` | 0 | `p03-02-correct-integration`,12 HTTP checks |
| `npm.cmd run test:e2e` first | 1 | `p03-02-correct-e2e`,28 passed/2 new-test failures: alert locator matched app validation AND Next's route announcer; scoped assertion to main without removing validation |
| `npm.cmd run test:e2e` final | 0 | `p03-02-correct-e2e-final`,30 passed; JSON `p03-02-correct-demo-final-browser-results.json` |
| `git diff --check` | 0 | No whitespace errors |

AC-D1..D4 PASS. Runtime contract unchanged. Live Google, DB/RLS, cloud persistence, actual scheduling and physical devices NOT RUN (outside task). GATE: G3 NOT VERIFIED; P03-04 next, then full G3 review. No package/lock/generated artifacts included in commit.
