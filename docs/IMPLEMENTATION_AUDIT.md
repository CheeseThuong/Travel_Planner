# Implementation audit

2026-10-21 (Asia/Saigon). Release: **NOT READY**. Initial `git status --short` was empty. No unknown edits were present. Existing historical artifacts are preserved separately from recovery evidence.

## Source inspected

AGENTS, complete Master and tracker, execution-report template, ADR0000–0016, existing task reports, all application routes/components, lint/vendor regression tests, demo browser suite/config, smoke/content/build scripts, package/lock/config files and catalog content validation. No migrations exist to inspect. Full user request read as UTF-8; the first PowerShell default-encoding display was mojibake, not evidence that repository strings were corrupted.

## Architecture and tooling

- Next16.4.2 App Router, React19.3.1, TypeScript6.0.3 strict, Tailwind4 via PostCSS, small shadcn-compatible Button. Node24.19.0 and npm11.17.0. Windows PowerShell blocks npm.ps1, so use `npm.cmd`; execution policy unchanged.
- Existing original cream/green SVG scenes and optional lazy Three/GSAP/Motion postcard work. Domain contains destination metadata only. No planning, scheduling, routes matrix, persistence, auth, server API or sync implementation.
- No Supabase project/migration/pgTAP tree or CLI; Docker executable exists, daemon NOT VERIFIED because P02 cannot start. No Supabase/Google app environment variable names found in this session; values were not inspected or printed. No staging/production setup was verified.
- `test:unit` is Node's10 lint-patch tests, **not Vitest planner coverage**. `test:integration` is11 HTTP route/content smoke checks, **not database/contract integration tests**. `test:e2e` is12 local Chrome demo tests, **not create/save/share E2E**. Vitest/Testing Library/fixtures/CI baseline remains dependent on P01-01.
- No `.github` workflow, OpenAPI document, Vercel config, monitoring, env validator or API handler tree exists. A successful Next build does not supply those features.

## Baseline verification

See [TEST_RESULTS](TEST_RESULTS.md) and `reports/evidence/R0-*`. Typecheck/lint/unit/HTTP smoke pass. `npm.cmd run build` initially failed EPERM writing Next telemetry config outside workspace; rerun with `NEXT_TELEMETRY_DISABLED=1` passed without code changes. All12 demo browser cases passed; sandbox teardown hung and required stopping the verified task-owned Next server, then command exited0. Audit reports zero vulnerabilities, which does not resolve EOL support or establish application security.

## Typography reproduction

`node scripts/audit-typography.mjs before` captured actual Chrome platform glyph selection at320/1440. Home heading uses Georgia19 glyphs plus Times New Roman3, with italic Georgia6/7 plus Times italic1. Đà Lạt, privacy, terms, new-plan and open headings also mix fonts. Tracking is -.055em (up to -5.016px in the hero). Screenshots and JSON live in `reports/evidence/R1-before/`. No text-splitting renderer, next/font/google subset configuration, variable font axes or source Unicode corruption was found. Rendering falls back per glyph on this Windows platform; this is directly observed, not a claim about every OS installation.

Baseline regression `node node_modules/playwright/cli.js test --config playwright.typography.config.mjs --project chromium-320 --grep 'complete local faces'` fails because actual heading uses Georgia/Times instead of intended Vietnamese-complete faces. Source/cmap verification and final rendered evidence are tracked under R1-01.

## Gate reconciliation

G0 accepted historically; five content/document validators rerun successfully. G1 remains FAIL: ESLint9.39.5 is EOL while public registry stable React7.37.5, a11y6.10.2 and import2.32.0 peer ranges exclude ESLint10.13.0. Evidence: R0-*-peer.json, R0-eslint-version.json/tree.json. [ESLint support](https://eslint.org/version-support/) confirms EOL on2026-08-06. Existing ADR0014/0015 prohibit treating forced peers, rule removal or audit-zero as support resolution. No packages/lock/vendor changes were made by recovery.

No supported compatible upstream tree was found. A larger maintained lint replacement/fork or commercial support needs a concrete support/security review; it is not silently approved by locally passing checks. P01-02..04 retain their blocked dependency; G2–G8 NOT VERIFIED. R0 audit/R1 scaffold correction are independent under ADR0016, not a gate bypass.

## Product gaps and conflicts

[FEATURE_MATRIX](FEATURE_MATRIX.md) covers every current route and requested action. Functional destination discovery, wizard/planner/save/share are absent, not bugs in already working modules. Sixty independently sourced editorial draft records exist but are not publication-verified; no prices/hours/coordinates were invented or promoted to verified facts.

Recovery plan records five-vs-four-step wizard and `plan_runs`-vs-`trip_plan_runs` conflicts for their authorized implementation phases. Existing scope/canonical contracts remain unchanged. Full release needs implementation and real browser/database/staging tests, not more placeholder routes or optimistic completion labels.
