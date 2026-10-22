# WORK_ITEMS.md — Task Tracker and Execution Gates

> Initial state as of 2026-10-21: **NONE IMPLEMENTED, NONE TESTED**. All gates are `NOT VERIFIED`.
> Update `[ ]` -> `[x]` only after verifying tests and recording evidence, not merely writing code.
> Current execution state: G0/G1 PASS. P02-01..03 DONE; P02-03 CI run39714338214 passed audit/full baseline, two clean121-case DB replays and real Auth integration. P02-04 concurrency/replay closure is IN_PROGRESS; G2 remains NOT VERIFIED. Independent P01-06 requested two-city 3D extension DONE. [Baseline report](reports/P01-BASELINE.md).
> Recovery audit/typography R0-01/R1-01 DONE; R0-02 corrected/DONE through COMPAT. Full product NOT READY: wizard/planner/cloud/save/share remain unimplemented. Historical reports are retained; this current state supersedes their old support-blocked status.

## Task tracker rules

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

## PHASE 02 — PostgreSQL, Auth and permissions — Gate G2 NOT VERIFIED

- [x] **P02-01** Supabase local setup, destination/place migrations, separate Nha Trang/Đà Lạt editorial seed (ADR-0013). Status: DONE. Depends: G1, P00-04, P00-05 DONE. [Report](reports/P02-01.md), [ADR0021](adr/ADR-0021.md). Actual Windows loopback bindings and Ubuntu CI startup/port guard/reset/replay verified; no global Docker/PATH changes.
- [x] **P02-02** Trips/stops/share tables with constraints, transactional repositories and indexes. Status: DONE. Depends: P02-01. [Report](reports/P02-02.md), [ADR0020](adr/ADR-0020.md). Local strengthened113-case suite and CI reset/113 tests twice PASS; full Windows baseline PASS. No owner UI/API functionality claimed.
- [x] **P02-03** Auth session (guest via anonymous sign-in), verified-owner repository, and ADR0022 party/budget/planning-mode persistence. Status: DONE. Depends: P02-02 DONE. Real session A/B, null/forged auth, exact expanded TripDraft roundtrip plus CI audit/replay PASS. [Plan](reports/P02-03-PLAN.md), [report](reports/P02-03.md).
- [ ] **P02-04** pgTAP negative permissions, parallel owner CAS, clean migration replay and G2 review. Status: VERIFYING. Depends: P02-03 DONE. Local CAS repeated and clean replay PASS; fresh CI pending. [Plan](reports/P02-04-PLAN.md), [report](reports/P02-04.md).
- [ ] **G2** Gate approval. Verify: no public private-data access and all auth tests pass.

## PHASE 03 — Catalog, wizard and safe place import — Gate G3 NOT VERIFIED

- [ ] **P03-01** Nha Trang/Đà Lạt destination landing/catalog/filter/pagination/mobile. Depends: G2. Tests: search, empty state, 360px, destination isolation and attribution.
- [ ] **P03-02** Wizard dates/time/lodging/transport/pace, party size, VND budget, assisted/manual mode and stop selection. Depends: P03-01. Tests: AC-001/016/017/018; validation, date and money boundaries.
- [ ] **P03-03** Google Maps full/short URL parser, allowlist redirect, candidate selection and manual fallback. Depends: G1, P03-02. Tests: T-012/13/14, SSRF guards.
- [ ] **P03-04** Loading/error/offline/reduced-motion states. Depends: P03-01..03. Tests: UI a11y and keyboard.
- [ ] **G3** Gate approval. Verify: create accurate local draft without live Google API key.

## PHASE 04 — Routing and planner — Gate G4 NOT VERIFIED

- [ ] **P04-01** Time-window model, trip-calendar bounds, locks and deterministic fixtures. Depends: G3. Tests: T-001/004/005/010/011.
- [ ] **P04-02** RoutingProvider interface, safe approximate fallback, optional Google route adapter and API usage budget. Depends: P04-01. Tests: T-006/007/015/016/028.
- [ ] **P04-03** Required-first feasible insertion, budget-aware optional insertion, local search, unscheduled explanation and non-mutating manual validator. Depends: P04-02. Tests: T-008/009/031/032/033 plus edge cases in Master Planner.
- [ ] **P04-04** Generate candidate/apply-plan endpoints, optimistic version. Depends: P04-03, G2. Tests: T-008, stale run, contract schemas.
- [ ] **P04-05** Planner benchmark, property-based invariants, no API from domain, budget metrics. Depends: P04-04. Tests: NFR-03, no data loss.
- [ ] **G4** Gate approval. Verify: candidate itinerary deterministic, feasible, complete or explicitly unscheduled.

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
