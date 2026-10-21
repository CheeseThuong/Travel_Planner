# WORK_ITEMS.md — Task Tracker and Execution Gates

> Initial state as of 2026-10-21: **NONE IMPLEMENTED, NONE TESTED**. All gates are `NOT VERIFIED`.
> Update `[ ]` -> `[x]` only after verifying tests and recording evidence, not merely writing code.
> Current execution state: P00-01..04 DONE (technical/content design); G0 NOT VERIFIED pending [owner review](phase-00/G0_REVIEW.md). Baseline statement above describes the initial state, not current results.

## Task tracker rules

For each checked item, add a line to **Evidence log** with: task ID, commit hash/PR, commands and exit codes, associated acceptance tests, date and outstanding defects. Dependencies must be closed before work begins unless marked `PARALLEL-OK` and the phase gate discipline is preserved.

## PHASE 00 — Foundation decisions — Gate G0 NOT VERIFIED

- [x] **P00-01** Freeze PRD & non-goals. Status: DONE. Depends: none. Verify: every FR/BR has owner and acceptance ID; unresolved items documented. Evidence: [report](reports/P00-01.md), [baseline](phase-00/PRD_BASELINE.md).
- [x] **P00-02** Document ADR 01–10, cost-control strategy and build constraints. Status: DONE. Depends: P00-01. Verify: architecture and dependency diagram reviewed. Evidence: [report](reports/P00-02.md).
- [x] **P00-03** Licensing/policies checklist: Google Place/Routes, attribution, image license, privacy/terms. Status: DONE (technical design review; not legal/release approval). Depends: P00-01. Verify: technical compliance checklist signed; policies linked. Evidence: [report](reports/P00-03.md).
- [x] **P00-04** Seed-data content design 30–50 editorial records Nha Trang, with evidence of image/data rights. Status: DONE (30 sourced draft records, six original category SVGs; publication not verified). Depends: P00-03. Verify: seed schema/sample and negative cases pass validation. Evidence: [report](reports/P00-04.md).
- [ ] **G0** Gate approval. Status: NOT VERIFIED; [review packet](phase-00/G0_REVIEW.md). Verify: tasks above completed, baseline decisions unchanged or ADR logged; owner acceptance of ODbL catalog licensing strategy/docs pending.

## PHASE 01 — Scaffold and CI — Gate G1 NOT VERIFIED

- [ ] **P01-01** Next.js TS strict, Tailwind, shadcn, route skeleton. Depends: G0. Tests: `typecheck`, `lint`, `build`.
- [ ] **P01-02** Vitest, Testing Library, Playwright and deterministic fixtures. Depends: P01-01. Tests: fixture smoke + e2e hello route.
- [ ] **P01-03** Domain and provider adapter interfaces; no provider SDK in domain. Depends: P01-01. Tests: package boundary/lint constraint.
- [ ] **P01-04** Env schema validation, request ID, redaction baseline, feature flags and CI pipeline. Depends: P01-01. Tests: missing secret behavior, no secret in build/client.
- [ ] **G1** Gate approval. Verify: build/typecheck/lint/unit pipeline green in CI.

## PHASE 02 — PostgreSQL, Auth and permissions — Gate G2 NOT VERIFIED

- [ ] **P02-01** Supabase local setup, destination/place migrations, Nha Trang editorial seed. Depends: G1, P00-04. Tests: clean reset and seed validation.
- [ ] **P02-02** Trips/stops/share tables with constraints, transactional repositories and indexes. Depends: P02-01. Tests: migration integrity; invalid rows rejected.
- [ ] **P02-03** Auth session (guest via anonymous sign-in), owner API guards and RLS/grants for each private table. Depends: P02-02. Tests: user A/B, null auth, forged owner_id.
- [ ] **P02-04** pgTAP DB negative permission tests + migrations idempotent/replayable from blank DB. Depends: P02-03. Tests: `supabase test db` and reset.
- [ ] **G2** Gate approval. Verify: no public private-data access and all auth tests pass.

## PHASE 03 — Catalog, wizard and safe place import — Gate G3 NOT VERIFIED

- [ ] **P03-01** Destination landing/catalog/filter/pagination/mobile. Depends: G2. Tests: search, empty state, 360px.
- [ ] **P03-02** Wizard dates/time/lodging/transport/pace and stop selection. Depends: P03-01. Tests: AC-001; validation, date boundaries.
- [ ] **P03-03** Google Maps full/short URL parser, allowlist redirect, candidate selection and manual fallback. Depends: G1, P03-02. Tests: T-012/13/14, SSRF guards.
- [ ] **P03-04** Loading/error/offline/reduced-motion states. Depends: P03-01..03. Tests: UI a11y and keyboard.
- [ ] **G3** Gate approval. Verify: create accurate local draft without live Google API key.

## PHASE 04 — Routing and planner — Gate G4 NOT VERIFIED

- [ ] **P04-01** Time-window model, trip-calendar bounds, locks and deterministic fixtures. Depends: G3. Tests: T-001/004/005/010/011.
- [ ] **P04-02** RoutingProvider interface, safe approximate fallback, optional Google route adapter and API usage budget. Depends: P04-01. Tests: T-006/007/015/016/028.
- [ ] **P04-03** Required-first feasible insertion, optional insertion, local search, unscheduled explanation, constraint verifier. Depends: P04-02. Tests: T-008/009 plus 13 edge cases in Master Planner.
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
| P00-01 | DONE | Uncommitted; baseline 7bb3f3e | `node scripts/verify-p00-01.mjs` -> 0; 178 checks after ADR-0011; [report/log](reports/P00-01.md) | P00-01-AC01..04 PASS; runtime NOT RUN | G0 review pending | 2026-10-21 |
| P00-02 | DONE | Uncommitted; baseline 7bb3f3e | `node scripts/verify-p00-02.mjs` -> 0; [report/log](reports/P00-02.md) | P00-02-AC01..03 PASS | G0 policy/rights/clarifications pending | 2026-10-21 |
| P00-03 | DONE | Uncommitted; baseline 7bb3f3e | `node scripts/verify-p00-03.mjs` -> 0; primary-source web review; [report](reports/P00-03.md) | P00-03-AC01..03 PASS (technical scope) | Runtime/legal P08 review NOT RUN | 2026-10-21 |
| P00-04 | DONE | Uncommitted; baseline 7bb3f3e | `python scripts/build-editorial-seed.py` -> 0; `node scripts/verify-p00-04.mjs` -> 0; [report/log](reports/P00-04.md) | P00-04-AC01..03 PASS (content design) | G0 ODbL strategy acceptance pending; all records draft | 2026-10-21 |
| G0 | NOT VERIFIED | Uncommitted | Technical checks PASS; [review packet](phase-00/G0_REVIEW.md) | Owner design/license acceptance pending | No Phase 01 work allowed | 2026-10-21 |

## Known blockers / decisions

- User approved task/gate bookkeeping clarification: [ADR-0000](adr/ADR-0000.md). Task DONE requires task evidence; phase progression still requires gate PASS.
- All unresolved scope/contract/content decisions and owners: [decision register](phase-00/DECISION_REGISTER.md). G0 cannot PASS while blocking decisions remain unresolved.

- Live Google Places/Routes requires an API key, billing/quota configuration and terms review. The project **must still work in approximate/mock mode without the key**.
- User editorial content and artwork must have clear usage rights; never seed assets by scraping copyrighted photos.
- No staging/prod credentials supplied in this document. Agent must use `.env.example` and document required keys, not invent keys.

## Minimum initial instruction for a Coding Agent

> Read `AGENTS.md`, `docs/MASTER_PLANNER.md` and `docs/WORK_ITEMS.md` completely. Start from PHASE 00. Inspect repository and current tests first; if repository is empty, create the agreed architecture without skipping gate requirements. For each work item, show plan, modify only relevant files, run evidence-based tests, update tracker. Never advance on a FAIL or NOT VERIFIED gate. Use mock providers when real API credentials are unavailable. Do not ask for credentials until the phase needs real provider integration; do not fabricate results.
