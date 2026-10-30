# WORK_ITEMS.md — Task Tracker and Execution Gates

> Initial state as of 2026-10-21: **NONE IMPLEMENTED, NONE TESTED**. All gates are `NOT VERIFIED`.
> Update `[ ]` -> `[x]` only after verifying tests and recording evidence, not merely writing code.
> Current execution state2026-10-29: G0–G4 PASS. P04-01..05 DONE; user explicitly approved “Duyệt G4, tiếp tục Discovery”. [P04 API evidence](reports/P04-04.md), [G4 review](reports/P04-05.md). Smart Discovery begins at SD01-01. Existing Atlas V2/local planner are preserved; durable editor and sharing remain incomplete. No production approval.
> Pre-existing Atlas/package/lock/API changes were preserved; branch `fix/audit-and-upgrade`, HEAD `99d6a29`, no commit/push of mixed ownership. Historical reports below are retained. The current state supersedes their old support/scaffold-only status.

## Task tracker rules

Current corrective task2026-10-30: **R-HYDRATION-20261030 IN_PROGRESS**, per latest user attachment. Fresh HEAD31242c4 and new uncommitted DOC Vault/editorial/gTrack changes are preserved; old99d6a29 evidence remains historical. Reproduced1 lint error/3 warnings; scope, rollback, installation/hydration checks in [report](reports/R-HYDRATION-20261030.md). UX01-01B remains pending final verification; no G5–G8 approval inferred from added vault code.

2026-10-28 recovery: **P03-BASELINE DONE**, corrective prerequisite to P03-03. [Plan/evidence](reports/AUDIT-BASELINE-20261028.md), [audit](../AUDIT.md). Its local suite passed; missing browsers resolved using existing `.tools/browsers`. P03-02's inaccurate-draft acceptance conflict was subsequently resolved by697a06d; G3 now PASS per the final review above. Historical G0/G1/G2 approvals are retained, not fresh DB/CI tests.

For each checked item, add a line to **Evidence log** with: task ID, commit hash/PR, commands and exit codes, associated acceptance tests, date and outstanding defects. Dependencies must be closed before work begins unless marked `PARALLEL-OK` and the phase gate discipline is preserved.

## PHASE 00 — Foundation decisions — Gate G0 PASS

- [x] **P00-01** Freeze PRD & non-goals. Status: DONE. Depends: none. Verify: every FR/BR has owner and acceptance ID; unresolved items documented. Evidence: [report](reports/P00-01.md), [baseline](phase-00/PRD_BASELINE.md).
- [x] **P00-02** Document ADR 01–10, cost-control strategy and build constraints. Status: DONE. Depends: P00-01. Verify: architecture and dependency diagram reviewed. Evidence: [report](reports/P00-02.md).
- [x] **P00-03** Licensing/policies checklist: Google Place/Routes, attribution, image license, privacy/terms. Status: DONE (technical design review; not legal/release approval). Depends: P00-01. Verify: technical compliance checklist signed; policies linked. Evidence: [report](reports/P00-03.md).
- [x] **P00-04** Seed-data content design 30–50 editorial records Nha Trang, with evidence of image/data rights. Status: DONE (30 sourced draft records, six original category SVGs; publication not verified). Depends: P00-03. Verify: seed schema/sample and negative cases pass validation. Evidence: [report](reports/P00-04.md).
- [x] **G0** Gate approval. Status: PASS; [review packet](phase-00/G0_REVIEW.md), user confirmation 2026-10-21, four document/content checks rerun exit 0 (G0-confirmed logs). No release/deployment approval inferred.
- [x] **P00-05** Đà Lạt editorial catalog extension. Status: DONE (content design). Depends: G0, P00-04. PARALLEL-OK with P01 scaffold; required before Đà Lạt P02 seed/P03 catalog. Verify: 30 sourced drafts, rights/provenance, schema/18 negative checks, deterministic rebuild and city separation PASS. [Report](reports/P00-05.md), [scope ADR](adr/ADR-0013.md).

## PHASE 01 — Scaffold and CI — Gate G1 PASS (actual remote baseline verified)

- [x] **P01-01** Next.js TS strict, Tailwind, shadcn, route skeleton. Status: DONE after P01-01-COMPAT correction. Depends: G0 PASS. Maintained ESLint10/project adapters, valid strict peer tree, full audit0,19 tooling/12 browser/11 HTTP checks/typecheck/lint/build PASS. [Correction](reports/P01-01-COMPAT.md), [ADR0017](adr/ADR-0017.md). Original failure reports retained as history.
- [x] **P01-01-COMPAT** Reviewed maintained-core compatibility correction. Status: DONE. All AC-C1..4 PASS; no weakened rules or forced peers. [Report](reports/P01-01-COMPAT.md). G1 still requires remaining baseline tasks/actual CI.
- [x] **P01-01-FIX** Scoped security correction. Status: DONE. Depends: G0; correction within P01-01. Full audit0, ten rule/config/helper regression tests PASS; parent remains BLOCKED on support. [Report](reports/P01-01-FIX.md), [ADR-0015](adr/ADR-0015.md).
- [x] **P01-05** Explicitly requested local motion/performance preview. Status: DONE. Depends: G0 PASS and verified P01-01-FIX; PARALLEL-OK independent Phase01 extension per ADR-0015. Three.js/GSAP/Motion skills applied, 12 browser checks PASS, measured three routes and active3D, local browser opened. [Report](reports/P01-05.md). Does not complete P07 or permit P02+.
- [x] **R0-01** Requested repository/feature audit. Status: DONE. Depends: G0; independent read-only recovery. Six baseline commands, current npm support metadata and actual typography reproduction recorded. [Audit](IMPLEMENTATION_AUDIT.md), [matrix](FEATURE_MATRIX.md), [plan](IMPLEMENTATION_RECOVERY_PLAN.md).
- [x] **R1-01** Existing scaffold Vietnamese typography correction. Status: DONE. Depends: R0-01 DONE; independent P01 correction per ADR-0016. Licensed complete local fonts, actual normal/italic/body glyph audit, 72 cross-browser tests and 12 demo tests PASS; three local Lighthouse runs recorded (84/91/94 Performance, CLS <=0.043). [Results](TEST_RESULTS.md), [report](EXECUTION_REPORT.md). Does not complete P07 or dependent features.
- [x] **R0-02** P01-01 support correction. Status: DONE via explicitly reviewed project-maintained adapters/core10; upstream peer limits remain unchanged and are not misrepresented. [Report](reports/P01-01-COMPAT.md). NEXT: P01-02..04, actual CI.
- [x] **P01-02** Vitest, Testing Library, Playwright and deterministic fixtures. Status: DONE. Depends: P01-01 DONE. [Report](reports/P01-BASELINE.md). Fixtures/component/coverage/browser baseline PASS; no product journey inferred.
- [x] **P01-03** Pure domain/provider/storage interfaces and fixture adapter. Status: DONE. Depends: P01-01 DONE. Domain import/lint/client-boundary/directed clone/abort tests PASS. [Report](reports/P01-BASELINE.md).
- [x] **P01-04** Env/request ID/redaction/flags/health/CI. Status: DONE. Depends: P01-01 DONE. Local negative tests, build canary and HTTP baseline PASS; actual GitHub CI run39611614744 PASS for b91d1a8. [Report](reports/P01-BASELINE.md).
- [x] **P01-06** Requested additional two-city Three.js effects. Status: DONE. Independent P01 extension;16 browser/72 typography checks PASS; local active27.79/27.60fps (30fps cap), context-loss/orbit/stop tested. [Report](reports/P01-06.md). Does not complete catalog/planner or G7.
- [x] **G1** Gate approval. Status: PASS. P01-01..04 DONE; actual remote CI completed success for b91d1a8. [Review and durable evidence](reports/G1-REVIEW.md). Next allowed task P02-01; G2+ remain NOT VERIFIED.

## PHASE 02 — PostgreSQL, Auth and permissions — Gate G2 PASS

- [x] **P02-01** Supabase local setup, destination/place migrations, separate Nha Trang/Đà Lạt editorial seed (ADR-0013). Status: DONE. Depends: G1, P00-04, P00-05 DONE. [Report](reports/P02-01.md), [ADR0021](adr/ADR-0021.md). Actual Windows loopback bindings and Ubuntu CI startup/port guard/reset/replay verified; no global Docker/PATH changes.
- [x] **P02-02** Trips/stops/share tables with constraints, transactional repositories and indexes. Status: DONE. Depends: P02-01. [Report](reports/P02-02.md), [ADR0020](adr/ADR-0020.md). Local strengthened113-case suite and CI reset/113 tests twice PASS; full Windows baseline PASS. No owner UI/API functionality claimed.
- [x] **P02-03** Auth session (guest via anonymous sign-in), verified-owner repository, and ADR0022 party/budget/planning-mode persistence. Status: DONE. Depends: P02-02 DONE. Real session A/B, null/forged auth, exact expanded TripDraft roundtrip plus CI audit/replay PASS. [Plan](reports/P02-03-PLAN.md), [report](reports/P02-03.md).
- [x] **P02-04** pgTAP negative permissions, parallel owner CAS, clean migration replay and G2 review. Status: DONE. Depends: P02-03 DONE. Local CAS/replay and GitHub Actions run39716637974 PASS. [Plan](reports/P02-04-PLAN.md), [report](reports/P02-04.md).
- [x] **G2** Gate approval. Status: PASS. No public private-data access; two DB replays and real Auth integration passed in run39716637974.

## PHASE 03 — Catalog, wizard and safe place import — Gate G3 PASS

- [x] **P03-01** Nha Trang/Đà Lạt destination landing/catalog/filter/pagination/mobile. Status: DONE. Depends: G2 PASS. Search, empty state, 360px, destination isolation, pagination and attribution PASS. [Report](reports/P03-01.md).
- [x] **P03-02** Wizard dates/lodging/transport/pace, party size, VND budget, assisted/manual mode and stop selection. Status: DONE. Depends: P03-01 DONE. AC-001/016/017/018 and desktop/mobile E2E PASS. [Report](reports/P03-02.md).
- [x] **P03-03** Google Maps full/short URL parser, allowlist redirect validation, editorial candidate selection and manual fallback. Status: DONE (no-fetch pathway, ADR0024). Depends: G1, P03-02. T-012/13/14 and SSRF/no-network/API/mobile tests PASS. Shortlinks intentionally require expanded URL/manual entry; no expansion claim. [Report](reports/P03-03.md).
- [x] **P03-02-CORRECT** Accurate-draft acceptance conflict resolved. Status: DONE. Arrival/departure/base coordinates, required controls, all30 catalog places, selection order and truthful unsaved prepared-input review. Depends: P03-03 DONE. [Report](reports/P03-02-CORRECT.md); no planner implementation.
- [x] **P03-04** Loading/error/offline/empty/reduced-motion states. Status: DONE. Depends: P03-01..03 and accurate-draft correction. UI keyboard/offline/error/retry/mobile tests PASS. [Report](reports/P03-04.md).
- [x] **G3** Gate approval. Status: PASS2026-10-28. Accurate in-memory draft/no-key safe import/manual fallback verified. [Review](reports/G3-REVIEW.md);34 E2E/72 typography and mandatory suite PASS. No persistence/planner/live-provider claim.

## PHASE 04 — Routing and planner — Gate G4 PASS (user-approved2026-10-29)

- [x] **P04-01** Time-window model, trip-calendar bounds, lock diagnostics and deterministic fixtures. Status: DONE. Depends: G3 PASS. T-001/004/005/010/011 foundation tests PASS; directed travel feasibility follows in P04-03. [Report](reports/P04-01.md).
- [x] **P04-02** Strict directed RoutingProvider matrix validation, safe approximate fallback and bounded one-attempt provider deadline/size cap. Status: DONE (no-key/injected-provider scope; optional live Google adapter remains deferred/OFF). Depends: P04-01 DONE. T-006/007/015/016/028 PASS; unknown failed usage remains null. [Report](reports/P04-02.md), [ADR0027](adr/ADR-0027.md).
- [x] **P04-03** Required-first feasible insertion, geographic clustering/directed improvement, soft budget-aware optional priority, explicit unscheduled/unfulfilled required and non-mutating manual validator. Status: DONE (pure engine; public integration next). Depends: P04-02 DONE.113 Vitest cases including25 independent seeded invariants PASS. [Report](reports/P04-03.md), [ADR0028](adr/ADR-0028.md).
- [x] **P04-04** Generate candidate/apply-plan endpoints, optimistic version. Status: DONE in local no-key API scope. Depends: P04-03, G2. Verified Auth/RLS, separate generation, explicit atomic apply, stale/tampered/retry/CAS, retained locks/required/unscheduled;160 pgTAP twice,6 real Auth tests, mandatory suite and38 E2E PASS. [Report](reports/P04-04.md). G4 remains NOT VERIFIED.
- [x] **P04-05** Planner benchmark, property-based invariants, no API from domain, budget metrics. Status: DONE. Depends: P04-04 DONE.60 generated invariants plus4 provider/matrix cases;42 benchmark cases;31 tooling +160 Vitest, mandatory suite and72 typography PASS. [Evidence/G4 review](reports/P04-05.md). G4 NOT VERIFIED pending user decision.
- [x] **G4** Gate approval. Status: PASS2026-10-29, explicit user reply “Duyệt G4, tiếp tục Discovery” after [review evidence](reports/P04-05.md). Local no-key scope, no release/provider approval. Next SD01-01.

## Smart Discovery extension — G4 PASS; UX01-01A IN_PROGRESS

User-requested scope/order: [ADR-0030](adr/ADR-0030.md). Status/evidence: [Smart Discovery](reports/SMART-DISCOVERY.md). Unstarted rows remain TODO/tests NOT RUN; each needs its own narrow specification before code. This index does not waive G5–G8 or select new dependencies/providers.

| Task | Acceptance / repeatable verification | Depends |
|---|---|---|
| SD01-01 | DONE: unified pure place model, ten groups, legacy-six/lodging/provenance tests; static/unit/build0 | G4 PASS |
| SD01-02 | DONE: additive profiles/forward null correction; unchanged legacy rows,197 pgTAP twice/Auth6, static/unit/build0; ADR0031 | SD01-01 |
| SD02-01 | DONE: two-city configured polygon/bbox/distance zones;7 geo cases and unknown/prototype-city guard; radius distinct from border | SD01-01 |
| SD03-01 | DONE in fixture/default-OFF scope: reviewed Brave contract/terms, one-attempt/abort/byte/quota bounds,15 fixture cases, secret env guard; ADR0032 | SD01-01 |
| SD03-02 | DONE: bounded discovery API with no-key/fixture fallback, strict generated OpenAPI;199 units,15 HTTP and40 E2E PASS | SD01-02, SD02-01, SD03-01 |
| SD04-01 | DONE: bounded certain/suspected matching, immutable source retention, overwrite regression fixed;210 units/15 HTTP/40 E2E PASS | SD03-02 |
| SI01-01 | DONE: safe search-path/root Maps hints, independent local name/address fallback and confirmation;211 units/15 HTTP/44 E2E PASS; no-fetch limitations explicit | SD04-01 |
| SI02-01 | DONE: on-demand native OSM pin selection,11 math tests,222 units and48 E2E PASS; first Chrome resource failure retained; ADR0033 | SI01-01 |
| SI03-01 | DONE in storage scope: separate private submissions, sanitized approved read/RLS/audit/quotas;101 new pgTAP,298 twice/Auth6/241 units PASS; ADR0034 | SD01-02, SD04-01 |
| SI03-02 | DONE local: verified session/submit/paged owner/moderator/public API/UI;248 units/302 pgTAP twice/Auth8/56 E2E+2 real contribution browsers/72 typography PASS | SI02-01, SI03-01 |
| UX01-01A | DONE: ten category/zone filters, source/uncertainty details and map preview; transfer-loss regression fixed;224 units/56 E2E/72 typography PASS | SD03-02, SI02-01 |
| UX01-01B | IN_PROGRESS: simplified basics/optional preferences, online/offline hybrid preview, explicit suggestion confirmation and preserved inputs/candidate on errors | UX01-01A, AI02-02 |
| AI01-01 | DONE fixture/default-OFF: reviewed strict-output production subset, exact UUID permutation/fact guards, bounded request/token/cost/abort/redaction;19 adapter cases/267 units/HTTP19/static/build PASS | SD03-02 |
| AI02-01 | DONE pure scope: optional preferences/source-safe deterministic ranking for0/1/2/30; selection/required/locks preserved, explicit conflicts/filtered windows;20 pool cases/287 units/static/build PASS | AI01-01, SD04-01 |
| AI02-02 | DONE API/application scope: bounded provider fallback → existing planner → post-verification, stateless strict source-validated preview;303 units/HTTP20/E2E60/static/build PASS | AI02-01, UX01-01A |
| UX01-02 | Integrate durable save/editor/swap/day/time/locks/export and read-only share after their existing gates/tasks; reload/offline/two-tab/owner/share E2E | AI02-02, P05/P06 prerequisites and applicable gates |

After extension acceptance, continue P05/P06 below; G7/G8 remain release blockers. All18 Smart Discovery product ACs must eventually be traced to evidence, not inferred from planner-only success.

## PHASE 05 — Local-first and trip editor — Gate G5 NOT VERIFIED

- [ ] **P05-01** Dexie drafts + schema migration, debounce/rehydration and local cache clear. Depends: G4. Tests: T-017.
- [ ] **P05-02** Owner save/reload, idempotency, atomic stops update, optimistic version handling. Depends: P05-01, G2. Tests: T-019/020/025.
- [ ] **P05-03** Timeline drag/drop, locks, conflict warnings and re-run. Depends: P05-02. Tests: T-011, keyboard alternative.
- [ ] **P05-04** Offline/reconnect, pending queue, sync indicator, multi-tab conflict flow. Depends: P05-02. Tests: T-018/019.
- [ ] **G5** Gate approval. Verify: no silent data loss across reload, offline and two tabs.

## PHASE 06 — Secure share/recovery — Gate G6 NOT VERIFIED

- [ ] **P06-01** 128-bit CSPRNG token, hash storage, uniqueness collision strategy, no plaintext audit logs. Depends: G5. Tests: format/entropy, DB only hash.
- [ ] **P06-02** `POST /shares/resolve`, no owner fields, read-only UI via fragment token, rate limit. Depends: P06-01. Tests: T-022/024/025.
- [ ] **P06-03** Revoke, optional expiry and repeated invalid-code response. Depends: P06-02. Tests: T-023.
- [ ] **P06-04** Cross-device E2E and security regression suite. Depends: P06-03. Tests: AC-009/010/011.
- [ ] **G6** Gate approval. Verify: view-only means truly view-only; no permission escalation.

## PHASE 07 — Design & quality — Gate G7 NOT VERIFIED

- [ ] **P07-01** Brand tokens, chibi landmark illustration system + asset rights/provenance and image optimization. Depends: G6. Tests: content licenses, alt text, visual diff.
- [ ] **P07-02** Motion + GSAP; optionally lazy Three.js by feature flag; reduced-motion branch. Depends: P07-01. Tests: T-027, perf benchmark.
- [ ] **P07-03** WCAG 2.2 AA + mobile devices 360px/768px/desktop; keyboard alternatives. Depends: P07-02. Tests: T-026/027 and axe.
- [ ] **P07-04** Lighthouse CI, image quality/CLS, initial render data budget. Depends: P07-03. Tests: NFR-01/02.
- [ ] **G7** Gate approval. Verify: visual accessibility and performance thresholds met.

## PHASE 08 — Release controls — Gate G8 NOT VERIFIED

- [ ] **P08-01** Separate staging/prod secrets and DB; provider quotas, budget alerts, observability. Depends: G7. Tests: environment separation.
- [ ] **P08-02** Opt-in Google API smoke tests on staging with bounded budget and field mask. Depends: P08-01. Tests: verified response + fallback on failure.
- [ ] **P08-03** Privacy/Terms, delete and revoke test, backup/restore practice, redaction review. Depends: P08-01. Tests: T-030 + DB recovery exercise.
- [ ] **P08-04** Production checklist and rollback procedure; final changelog and known limitations. Depends: P08-02/03. Tests: full release regression.
- [ ] **G8** Gate approval. Verify: zero open P0 bugs, hard gates all PASS, production deploy authorized.

---

## Evidence log (blank at baseline)

| Task ID | Status | Commit/PR | Commands & exit codes | AC/Test IDs | Blockers | Verified date |
|---|---|---|---|---|---|---|
| P04-05 | DONE | mixed working tree; no commit/push | typecheck/lint/unit160/build/HTTP14/E2E38/benchmark42 ->0; typography72/content ->0; [review](reports/P04-05.md) | AC-P1..4 PASS, NFR-03 local fixture p95 1.5015ms | G4 user review pending; extension ACs NOT RUN | 2026-10-29 |
| P04-04 / P04-BASELINE | DONE | mixed working tree; no commit/push | typecheck/lint/unit/build/integration/e2e/db reset+160pgTAP twice/Auth6 ->0; [report](reports/P04-04.md) | AC-B1/B2, AC-A1..4 PASS | P04-05 and G4 user review pending; no production/live-provider claim | 2026-10-29 |
| P04-03 | DONE | task commit | lint/typecheck/unit/build ->0;31 tooling +113 Vitest; [report](reports/P04-03.md) | AC-E1..4 PASS in pure-engine scope | P04-04 stale apply/public integration and P04-05/G4 pending | 2026-10-28 |
| P04-02 | DONE | task commit | lint/typecheck/unit/build ->0;31 tooling +72 Vitest; [report](reports/P04-02.md) | AC-R1..4 PASS | Optional live provider unimplemented/OFF; G4 pending | 2026-10-28 |
| P04-01 | DONE | task commit | lint/typecheck/unit/build ->0;31 tooling +67 Vitest; [report](reports/P04-01.md) | AC-C1..4 PASS | No public planner yet; G4 pending | 2026-10-28 |
| P03-04 / G3 | DONE / PASS | task commit | lint/typecheck/unit/build/integration/e2e/content/typography ->0;34 E2E/72 typography; [review](reports/G3-REVIEW.md) | AC-S1..4 PASS | G4+ not verified; no live-provider/persistence claim | 2026-10-28 |
| P03-02-CORRECT | DONE | task commit | lint/typecheck/unit/build/integration/e2e ->0;31 tooling +62 Vitest +30 E2E; [report](reports/P03-02-CORRECT.md) | AC-D1..4 PASS | P03-04/G3 pending | 2026-10-28 |
| P03-03 | DONE | task commit | lint/typecheck/unit/build/integration/e2e ->0;31 tooling +51 Vitest +28 E2E; [report](reports/P03-03.md) | AC-I1..4 PASS; T-012/13/14 | No-fetch fallback; distributed limits/live providers deferred; G3 pending | 2026-10-28 |
| P03-BASELINE | DONE | task commit | lint/typecheck/unit/build/integration/e2e/typography ->0; [report](reports/AUDIT-BASELINE-20261028.md) | AC-B1..B4 PASS | G3 accurate draft/import pending; package changes preserved | 2026-10-28 |
| P03-02 | DONE | working tree | typecheck/lint/build ->0; wizard E2E4/full E2E22 ->0; Playwright CLI mobile demo; [report](reports/P03-02.md) | AC-001/016/017/018 PASS | P03-03..04/G3 pending | 2026-10-22 |
| P03-01 | DONE | 1e8a09a; run39752205015 | typecheck/lint/unit/build ->0; E2E18 ->0; CI PASS; Playwright CLI mobile demo; [report](reports/P03-01.md) | search/empty/mobile/isolation/attribution/pagination PASS | P03-02..04/G3 pending | 2026-10-22 |
| P02-04 / G2 | DONE / PASS | f837ac8; run39716637974 | CI baseline and local-database jobs PASS; DB reset/121 pgTAP twice/Auth cleanup ->0; [report](reports/P02-04.md) | AC01..04 PASS | G3+ not verified | 2026-10-22 |
| P02-01 | DONE | 0a2df28; run39706971745 | Real local Supabase on Ubuntu CI: reset/42pgTAP twice/stop ->0; full Windows baseline PASS; [report](reports/P02-01.md) | AC01..04 PASS in recorded environments | Windows host image download; P02-02..04/G2 pending | 2026-10-22 |
| P01-01-COMPAT / R0-02 | DONE | b91d1a8 | strict npm ci/tree/audit, typecheck/lint/build/tooling -> 0; [report](reports/P01-01-COMPAT.md) | AC-C1..4 PASS | Project snapshot maintenance | 2026-10-21 |
| P01-02 / P01-03 | DONE | b91d1a8 | unit/coverage/content/typecheck/lint -> 0; 19 tooling +18 Vitest; [report](reports/P01-BASELINE.md) | AC02-1..3 / AC03-1..3 PASS | Product implementations pending | 2026-10-21 |
| P01-04 / G1 | DONE / PASS | b91d1a8; run39611614744 | Actual GitHub workflow all steps success; [job log](reports/evidence/P01-remote-ci.log), [review](reports/G1-REVIEW.md) | AC04-1..4 PASS | G2+ not verified | 2026-10-21 |
| P01-06 | DONE | b91d1a8 | e2e16 / typography72 -> 0; real context loss/orbit/stop and renderer samples; [report](reports/P01-06.md) | AC06-1..4 PASS | No physical mobile/G7 claim | 2026-10-21 |
| P00-01 | DONE | cc723ee | `node scripts/verify-p00-01.mjs` -> 0; 178 checks after ADR-0011; [report/log](reports/P00-01.md) | P00-01-AC01..04 PASS; runtime NOT RUN | G0 review pending | 2026-10-21 |
| P00-02 | DONE | cc723ee | `node scripts/verify-p00-02.mjs` -> 0; [report/log](reports/P00-02.md) | P00-02-AC01..03 PASS | G0 catalog-license acceptance pending | 2026-10-21 |
| P00-03 | DONE | cc723ee | `node scripts/verify-p00-03.mjs` -> 0; primary-source web review; [report](reports/P00-03.md) | P00-03-AC01..03 PASS (technical scope) | Runtime/legal P08 review NOT RUN | 2026-10-21 |
| P00-04 | DONE | cc723ee | `python scripts/build-editorial-seed.py` -> 0; `node scripts/verify-p00-04.mjs` -> 0; [report/log](reports/P00-04.md) | P00-04-AC01..03 PASS (content design) | G0 ODbL strategy acceptance pending; all records draft | 2026-10-21 |
| G0 | PASS | 09900f6; baseline cc723ee | Four validators rerun -> 0; [confirmation](reports/G0-CONFIRMATION.md), user acceptance | G0 scope/license accepted | Later gates still required | 2026-10-21 |
| P00-05 | DONE | 09900f6 | `python scripts/build-da-lat-seed.py` -> 0; `node scripts/verify-p00-05.mjs` -> 0; [report](reports/P00-05.md) | AC01..03 PASS; 30 drafts, 18 negatives, city separation | Publication/access/hours not verified | 2026-10-21 |
| P01-01 | BLOCKED | 09900f6; see current corrections | typecheck/lint/build/smoke -> 0; initial audit -> 1, corrected full audit -> 0; [report](reports/P01-01.md) | AC01..03 PASS; AC04 FAIL | Braces chain corrected by P01-01-FIX; ESLint9 EOL / React plugin no10 peers remains | 2026-10-21 |
| P01-01-FIX | DONE | a5f55fa | unit10/typecheck/lint/content/build/HTTP/audit -> 0; [report](reports/P01-01-FIX.md) | AC-FIX01..04 PASS | Parent support unresolved | 2026-10-21 |
| P01-05 | DONE | a5f55fa | e2e12/Lighthouse3/active3D -> 0; browser opened; [report](reports/P01-05.md) | AC01..05 PASS (local preview scope) | G1 FAIL; G7 NOT VERIFIED | 2026-10-21 |
| R0-01 | DONE | working tree; no commit/push | six baseline commands ->0 after telemetry correction; initial build1 retained; content0/audit0; [results](TEST_RESULTS.md) | R0-AC1..3 PASS | Product features unimplemented; G1 FAIL | 2026-10-21 |
| R1-01 | DONE | working tree; no commit/push | typecheck/lint/unit10/HTTP11/build/browser12/typography72/glyph audit/font coverage/Lighthouse3 ->0; [results](TEST_RESULTS.md) | R1-AC1..5 PASS within scaffold correction scope; physical phones/pixel baselines NOT RUN | G1 FAIL, G7/G8 NOT VERIFIED; full features blocked | 2026-10-21 |
| R0-02 | BLOCKED | working tree; no dependency changes | current npm peers/version/tree ->0, support criteria remain unmet; [audit](IMPLEMENTATION_AUDIT.md) | Supported compatible lint tree FAIL | ESLint9 EOL; stable plugin peers exclude10 | 2026-10-21 |

## Known blockers / decisions

- Historical P01-01 support blocker corrected by [COMPAT](reports/P01-01-COMPAT.md)/[ADR0017](adr/ADR-0017.md). Maintained core10 + explicit project adapters, original checks retained and full audit0. G1 now awaits actual CI; Phase02+ still prohibited until G1 PASS. Local Docker inventory reports daemon unavailable; its setup will be addressed only after G1.
- User confirmed G0 and requested Đà Lạt; [ADR-0013](adr/ADR-0013.md) records the scoped change. No repeated G0 permission needed.

- User approved task/gate bookkeeping clarification: [ADR-0000](adr/ADR-0000.md). Task DONE requires task evidence; phase progression still requires gate PASS.
- All unresolved scope/contract/content decisions and owners: [decision register](phase-00/DECISION_REGISTER.md). G0 cannot PASS while blocking decisions remain unresolved.

- Live Google Places/Routes requires an API key, billing/quota configuration and terms review. The project **must still work in approximate/mock mode without the key**.
- User editorial content and artwork must have clear usage rights; never seed assets by scraping copyrighted photos.
- No staging/prod credentials supplied in this document. Agent must use `.env.example` and document required keys, not invent keys.

## Minimum initial instruction for a Coding Agent

> Read `AGENTS.md`, `docs/MASTER_PLANNER.md` and `docs/WORK_ITEMS.md` completely. Start from PHASE 00. Inspect repository and current tests first; if repository is empty, create the agreed architecture without skipping gate requirements. For each work item, show plan, modify only relevant files, run evidence-based tests, update tracker. Never advance on a FAIL or NOT VERIFIED gate. Use mock providers when real API credentials are unavailable. Do not ask for credentials until the phase needs real provider integration; do not fabricate results.
