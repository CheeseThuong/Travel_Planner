# Baseline recovery — 2026-10-28

TASK: P03-BASELINE (corrective prerequisite to P03-03)
STATUS: DONE

## Specification before implementation

- AC-B1: Record the external audit commands, real exit codes and browser failures; distinguish environment failures, stale expectations, defects and missing features.
- AC-B2: Exclude only the external `.agent-skills/` clones from project lint. Keep all application rules and negative lint regression tests active.
- AC-B3: HTTP smoke asserts the current Vietnamese wizard heading and all existing status/language/health contracts.
- AC-B4: Run lint, typecheck, unit, build, integration, demo and typography checks; record blockers accurately before any Phase 03 progression.

Affected files: `eslint.config.mjs`, `tests/tooling/lint-patch.test.mjs`, `scripts/smoke-scaffold.mjs`, `AUDIT.md`, `README.md`, `docs/WORK_ITEMS.md`, this report. No API, schema, engine or runtime dependency change. Rollback: revert only these task hunks; retain all pre-existing user changes and audit artifacts.

## Inspected state and evidence

- HEAD `33beb14`, branch `fix/audit-and-upgrade`; no staged changes. Existing modifications: `.gitignore` adds `.agent-skills/`; package files add OpenAI 7.42 and relocate ws/undici metadata. Reviewed the diff; leave package/lock untouched and unstaged. No use of OpenAI was found in application source during this audit.
- Existing untracked `AUDIT.md`, `RUN_AUDIT.ps1`, browser screenshots and `scripts/docker-loopback/obj/` preserved. Screenshots, clones, generated obj and secrets must not enter commits.
- Latest external directory by LastWriteTime: `D:\Projects\travel_plan_audit_evidence_20261027-110421`. Read access succeeded; no sandbox blocker. All stdout/stderr logs inspected (typography failures correlated with JSON report).
- Historical CSV: strict install 0; lint 1; typecheck 0; unit 0 (30 tooling + 30 Vitest); integration 1; build 0; demo E2E 0 (22); typography 1 (24 passed, 48 failed, 0 skipped).
- Lint: one error/six warnings exclusively in cloned GSAP/scroll-world examples, because flat config does not read `.gitignore` as its ignore list.
- Integration: `/plan/new` still expects `Chuyến đi của riêng bạn`, replaced by P03-02 with `Lên kế hoạch theo cách của bạn`. Current wizard renders; preserve its behavior and assert the current specific heading.
- Typography JSON: all 24 Firefox cases cannot launch missing `firefox-1555/firefox/firefox.exe`; all 24 WebKit cases cannot launch missing `webkit-2370/Playwright.exe`. All 24 Chromium cases passed. This is missing test infrastructure, not evidence of 48 typography defects.
- Read repository AGENTS, README, master planner, tracker, ADR0000/0005/0010/0011/0018/0022/0023 and relevant source/tests. Reviewed cloned GSAP/Three/scroll-world READMEs and representative skills. No animation work or paid generation authorized by this task. No graphify graph exists; direct source inspection used without installing tools or creating a graph.

## Verification

All required baseline checks passed on the existing package/lock state. Exact PowerShell commands; raw stdout/stderr pairs in ignored `.tools/audit-20261028/` use these prefixes:

| Command | Exit | Evidence / result |
|---|---|---|
| `npm.cmd run lint` before fix | 1 | `baseline-lint.*.log`,1 error/6 warnings in clones |
| `node --test --test-name-pattern='external skill clones' tests/tooling/lint-patch.test.mjs` before fix | 1 | `lint-ignore-red.*.log`, boundary assertion fails |
| `npm.cmd run test:integration` before fix | 1 | `baseline-integration.*.log`, obsolete heading reproduced |
| `npm.cmd run lint` | 0 | `lint.*.log`, no warnings |
| `npm.cmd run typecheck` | 0 | `typecheck.*.log`, strict checks |
| `npm.cmd run test:unit` | 0 | `unit.*.log`,31 tooling +30 Vitest |
| `npm.cmd run build` (`NEXT_TELEMETRY_DISABLED=1`) | 0 | `build.*.log`, production local build |
| `npm.cmd run test:integration` | 0 | `integration.*.log`,11 pages +health |
| `npm.cmd run test:e2e` | 0 | `e2e.*.log`,22 passed; sandbox teardown stalled until verified test-owned Next server stopped |
| `npm.cmd run test:e2e` (`PLAYWRIGHT_REUSE_EXISTING_SERVER=true`) | 0 | `e2e-reuse.*.log`,22 passed in21.8s using existing local opt-in |
| `npm.cmd run test:typography -- --project=chromium-320 --project=chromium-360 --project=chromium-390 --project=chromium-768 --project=chromium-1024 --project=chromium-1440` | 0 | `typography-chromium.*.log`,24 passed |
| `npm.cmd run test:typography` (`PLAYWRIGHT_BROWSERS_PATH=D:\Projects\travel_plan\.tools\browsers`) | 0 | `typography-full.*.log`,72 passed across Chromium/Firefox/WebKit |
| `git diff --check` | 0 | No whitespace errors |

Browser evidence prefixes redirected JSON/screenshots into ignored `.tools/audit-20261028/`. `typography-full-browser-results.json`:72 expected,0 unexpected,0 skipped. `demo-reuse-browser-results.json`:22 expected. No generated images enter commits.

Browser recovery: initial install exited1 due sandbox `connect EACCES ...:443`. Escalated install stalled at0%; matching binaries were found in **existing** `.tools/browsers` (Firefox1555/WebKit2370), so verified owned downloader PID8020/child47492 was cancelled (exit1, not an install success). Full tests used the existing binaries. `Stop-Process` failed; its follow-up text was not evidence of successful cleanup. Escalated taskkill checked exact command line and parent first and successfully stopped only test-owned Next PID8796, releasing stalled E2E teardown with exit0. The reuse run independently exited0 before that cleanup. No shared browser/server was killed.

AC-B1..B4 PASS. DB/real Auth, live Google, production, new CI, physical-device checks and G7 performance are NOT RUN (outside this correction). Existing dependency changes were not adopted into a commit.

GATE: G3 NOT VERIFIED. G0/G1/G2 are historical PASS in the tracker, not fresh DB/CI results. Next: correct baseline failures, then P03-03; P04 prohibited until G3 PASS.
