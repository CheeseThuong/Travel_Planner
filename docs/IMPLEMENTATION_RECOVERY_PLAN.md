# Implementation recovery plan

Date: 2026-10-21. Release status: **NOT READY**. Preserve G0 acceptance and all existing working code. Current request adds recovery work, not permission to bypass G1–G8.

## R0-01 — Repository audit (P0, DONE)

- Dependencies: accepted G0; read-only audit is independent of blocked P01-01.
- Root cause: scaffold/demo completion was never product-feature completion; all advertised destination and plan routes need inspection.
- Files: IMPLEMENTATION_AUDIT, FEATURE_MATRIX, this plan, TEST_RESULTS, EXECUTION_REPORT, KNOWN_LIMITATIONS, DEPLOYMENT_GUIDE, WORK_ITEMS and evidence.
- Steps: inspect source/contracts/ADRs/test scripts; run six baseline commands; inspect browser rendering and navigation; reconcile real behavior with tracker.
- Acceptance: R0-AC1 all routes/features classified with source evidence; R0-AC2 commands retain exact outcomes and distinguish smoke from functional tests; R0-AC3 recovery tasks retain phase dependencies and rollback.
- Tests: existing unit/content/HTTP/browser suites, build/typecheck/lint; public registry support metadata.
- Data/API impact: none. Risks: false readiness claims; explicitly retain NOT READY. Rollback: remove recovery documents/evidence only.

## R1-01 — Correct existing scaffold Vietnamese typography (P0, DONE)

- Dependencies: R0-01 inspection and recorded reproduction; independent correction to existing P01 scaffold under current explicit request, not P07 progression. G1 remains blocked.
- Hypothesis to verify: Georgia lacks some Vietnamese glyphs on the tested platform; tight -.055em tracking and fixed large headings worsen mixed-font shaping/wrapping. No next/font, glyph splitting or source corruption has been found in inspected UI.
- Files: layout.tsx, globals.css, local licensed font assets, font provenance, typography browser tests/config, reports; adjust individual heading sizing only for measured overflow.
- Steps: capture before screenshot/platform-font evidence; acquire unmodified OFL Be Vietnam Pro and Nunito with hashes/licenses; self-host with next/font/local; use real normal/italic heading faces and reviewed weights; verify glyph coverage, NFC/NFD shaping, loading/failure, wrapping and layout stability.
- Acceptance: R1-AC1 recorded root cause; R1-AC2 loaded body/headings render Vietnamese through intended faces without missing glyph/fallback; R1-AC3 no overflow at 320/360/390/768/1024/1440; R1-AC4 Chromium/Firefox/WebKit screenshots and browser assertions pass; R1-AC5 reduced motion, no-JS and unavailable-font fallback remain usable, measured font-load CLS <=0.1.
- Tests: baseline reproduction before fix; repeatable 3-engine/6-width rendered tests, existing demo regressions, font/source coverage checks, typecheck/lint/build/HTTP/unit/content. Wizard/timeline visuals NOT RUN because unimplemented.
- Data/API impact: none. Risks: font weight/size/line-wrap changes and added font bytes; record sizes and actual browser loads. Rollback: revert local-font imports/styles/assets/tests for this task only; preserve all prior code and evidence.

## R0-02 — Resolve P01-01 lint support blocker (P0, BLOCKED)

- Dependencies: G0; correction within P01.
- Root cause: ESLint9 EOL while React/a11y/import plugins' current peer ranges exclude ESLint10; verify public registry rather than presume fixed.
- Files: ADR-0014/0015 only if an actual compatible supported solution is verified; package/lock/vendor/tests only after scoped review.
- Steps: query current stable metadata; compare enabled checks and package support; retain current checks until a reviewed compatible solution exists. No force/legacy-peer-deps, audit exceptions, or rule removals.
- Acceptance: supported compatible dependency tree, full audit, unchanged effective rules, positive/negative regression suite and typecheck/lint/build. If unmet, BLOCKED; no dependent work.
- Tests: registry metadata, npm tree/audit, existing tooling tests and full baseline. Data/API: none. Risks: unsupported/fork maintenance. Rollback: exact prior package/lock/vendor/config.

## Existing implementation tasks (P0/P1)

| Task | Priority/dependencies | Root cause / files / steps | Acceptance and tests | Risks / rollback |
|---|---|---|---|---|
| P01-02 | P0; P01-01 DONE | Add reviewed Vitest/Testing Library and deterministic fixtures; retain existing tooling tests and expand browser harness | fixture/component/E2E smoke, no assertion weakening | Dev dependency support; revert task-only packages/config |
| P01-03 | P0; P01-01 DONE | Pure domain types and provider/storage interfaces; enforce import boundaries | domain cannot import framework/SDK; fixture adapter tests | Contract drift; scoped ADR if changed, revert interfaces |
| P01-04/G1 | P0; P01-01 DONE; G1 also P01-02/03 | Env/request-id/redaction/flags and CI; .env.example, src/lib, .github | missing-secret fail-safe, no client leaks, local suite and actual CI evidence | CI availability/secrets; revert baseline-only code |
| P02-01..04/G2 | P0; G1 PASS | Supabase SQL/auth/RLS/transactions; supabase/migrations/tests, adapters | blank reset, seed preservation, pgTAP owner A/B/null/forged ownership, actual local DB | Docker/CLI; destructive reset limited to disposable test DB; migration rollback |
| P03-01..04/G3 | P0/P1; G2 PASS | Replace destination/wizard placeholders, catalog/selection, safe import/manual fallback; app/features/adapters | all wizard fields, city isolation, validation, SSRF/redirect tests, keyboard/mobile browser flow | Draft catalog not publication-approved; preserve provenance, rollback UI/adapter only |
| P04-01..05/G4 | P0; G3 PASS | Calendar/route matrix/deterministic optimizer/verifier, generate/apply | all Master edge/property tests, no drops/lock changes, stale version, benchmark | Routing uncertainty/cost; bounded provider disabled by default, revert engine version |
| P05-01..04/G5 | P0; G4 PASS | Dexie autosave and owner persistence, timeline editor/sync/conflicts | reload/reopen/offline/two-tabs/migrations/keyboard edits | Data loss; backup/export, versioned DB upgrades, preserve drafts on rollback |
| P06-01..04/G6 | P0; G5 PASS | Secure hash-only tokens, resolver/read-only viewer/revoke/rate limits | cross-context shares, invalid/revoked, privilege isolation and entropy | Token leakage/abuse; revoke and disable feature safely |
| P07-01..04/G7 | P1; G6 PASS | Preserve cream/green illustration brand, maps, a11y/performance/full visuals | WCAG journey/axe, 3-route Lighthouse, all browser visuals including actual editor | GPU/bundle/map licensing; retain static fallback |
| P08-01..04/G8 | P0 release; G7 PASS | Separate staging/prod, monitoring, live provider budget smoke, accurate legal text and operational drills | staging live success/failure, restore/delete/revoke, full release suite, operator/legal review | External credentials and legal decisions; documented rollback, production confirmation required |

## Recorded conflicts

- User requests a five-step wizard while Master 3.1 specifies four. Resolve in a scoped ADR at P03 before UI/contract implementation; no silent decision here.
- User names `plan_runs`; Master canonical table is `trip_plan_runs`. Preserve canonical contract until a reviewed schema ADR at P02.
- User requests immediate features while also forbidding progression past failing gates. Execute audit and existing scaffold corrections now; P02+ retains hard dependencies.
- All 60 editorial records are sourced **drafts**. Do not publish as verified attractions or invent hours/prices/access claims.
