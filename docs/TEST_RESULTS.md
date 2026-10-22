# Test results — updated 2026-10-22

Release **NOT READY**. G0 historical PASS with content validators rerun; G1 PASS; G2–G8 NOT VERIFIED. Passing commands below cover the scaffold and typography only.

2026-10-22: P02-01 actual CI run39706971745 PASS on0a2df28. Ubuntu local-Supabase startup, clean reset,42pgTAP cases, repeated reset/42cases and stop all passed. Windows full baseline passed26 tooling +18 Vitest,16 E2E, install/audit/typecheck/lint/coverage/content/build/client-canary/HTTP checks. [DB log](reports/evidence/P02-ci-db-pass.log), [baseline](reports/evidence/P02-ci-baseline-pass.log), [metadata](reports/evidence/P02-ci-result.json). Initial guard failure and pre-fix regression are retained. This verifies catalog schema/RLS/seed; private trip/auth/owner/save/share tests are NOT RUN. Windows host DB runtime remains unverified pending its image download.

Latest continuation: maintained ESLint10 strict tree/audit0;19 tooling +18 Vitest tests,16 demo E2E,72 typography checks, build/typecheck/lint/HTTP health/canary/coverage/content PASS. Evidence uses P01-COMPAT/P01-baseline/P01-06 prefixes; previous R1 screenshots/results preserved byte-for-byte. Actual remote CI run39611614744 PASS for b91d1a8; see [G1 review](reports/G1-REVIEW.md). See [current baseline report](reports/P01-BASELINE.md); historical R0/R1 results below remain the original turn's evidence.

All paths below are under `docs/reports/evidence/`. PowerShell uses `npm.cmd` because npm.ps1 is blocked by host execution policy. Build commands set `NEXT_TELEMETRY_DISABLED=1`.

| Exact command | Exit | Evidence | Interpretation |
|---|---:|---|---|
| `npm.cmd run typecheck` baseline/final | 0/0 | R0-baseline-typecheck.log / R1-typecheck-final.log | Strict TypeScript, no suppression |
| `npm.cmd run lint` baseline/final | 0/0 | R0-baseline-lint.log / R1-lint-final.log | Existing rule coverage retained |
| `npm.cmd run test:unit` baseline/final | 0/0 | R0-baseline-unit.log / R1-unit.log | 10 Node tooling regressions; not planner tests |
| `npm.cmd run build` baseline first | 1 | R0-baseline-build.log | Sandbox EPERM writing Next telemetry config; no application compile failure asserted |
| `npm.cmd run build` with telemetry disabled, baseline/final | 0/0 | R0-baseline-build-no-telemetry.log / R1-build-final.log | No keys or font-provider network needed |
| `npm.cmd run test:integration` baseline/final | 0/0 | R0-baseline-integration.log / R1-integration-final.log | 11 route/content/status/lang HTTP smoke checks, no DB/API security coverage |
| `npm.cmd run test:e2e` baseline | 0 | R0-baseline-e2e.log, R0-demo-browser-results.json | 12 demo cases; Windows sandbox teardown required stopping verified task-owned server |
| `npm.cmd run test:e2e` final, `DEMO_EVIDENCE_PREFIX=R1-demo` | 0 | R1-demo-isolated.log, R1-demo-browser-results.json | 12 Chrome desktop/mobile cases; separate output directory |
| `npm.cmd run test:content` baseline/final | 0/0 | R0-content.log / R0-content-final.log | All five content/document validators; no publication/legal approval inferred |
| `npm.cmd audit --json --fetch-retries=0` | 0 | R0-audit.json | Full unchanged dependency tree, zero reported vulnerabilities; EOL support still blocked |
| `npm.cmd view <plugin> version peerDependencies --fetch-retries=0 --json` for React/a11y/import; `npm.cmd view eslint version --fetch-retries=0 --json`; `npm.cmd ls eslint --all --json` | 0 | R0-*-peer.json, R0-eslint-version.json/tree.json | Current compatibility blocker reproduced; no force/legacy peer install |
| `node scripts/audit-typography.mjs before` | 0 | R1-before-audit.log, R1-before/platform-fonts.json +14 PNGs | Mixed Georgia/Times normal/italic Vietnamese glyphs reproduced at320/1440 |
| `node node_modules/playwright/cli.js test --config playwright.typography.config.mjs --project chromium-320 --grep 'complete local faces'` before app fix | 1 | R1-red.log | Expected regression failure: Georgia/Times instead of complete intended heading face |
| `python scripts/acquire-fonts.py` | 0 | R1-font-acquisition.json, fonts/PROVENANCE.json, OFL notices | Official complete unmodified six TTF assets; acquisition only, not required during build |
| `python scripts/verify-fonts.py` | 0 | R1-font-coverage.json | 154 Vietnamese characters/combining marks per face, valid weights/style/hashes,19 UTF-8 NFC sources |
| `node scripts/audit-typography.mjs after` final | 0 | R1-after-audit-final.log, R1-after/platform-fonts.json +15 PNGs | Actual normal/italic/body glyphs use expected custom PostScript faces; NFC/NFD corpus no system fallback |
| `npm.cmd run test:typography`, `PLAYWRIGHT_BROWSERS_PATH=.tools/browsers` | 0 | R1-typography-isolated.log, R1-browser-results.json/summary.json | 72 PASS,0 skipped/flaky/unexpected;18 browser-width projects;180 rendered PNGs |
| `node scripts/measure-typography.mjs` | 0 | R1-performance.log/json, R1-lighthouse-*.json | Three single local production measurements; simulated mobile360,3D idle; Performance84/91/94, A11y100, BestPractices100; no G7 approval |
| `git diff --check` | 0 | R1-diff-check.log | No diff whitespace errors; historical browser JSON emits only LF/CRLF conversion warning, verified byte-identical to HEAD with no content diff |

Final review: all eight required recovery documents exist; final JSON reports have0 skipped/unexpected/flaky tests; package-lock unchanged; historical tracked evidence has no content diff; all task-owned fixed-port previews stopped. Earlier user-owned preview was not terminated.

## Failures retained and corrected

- npm metadata initially blocked by sandbox network EACCES; retried read-only with network permission. npm.ps1 blocked by host policy; npm.cmd used without weakening that policy.
- Browser download primary mirror DNS failed; official fallback mirror succeeded. R1-browser-install.log retains both outcomes; final install exit0, Firefox157/WebKit27.2 workspace-local. Chrome version in actual glyph/performance artifacts.
- R1-cross-browser-initial.log:53 PASS/1 FAIL; WebKit errors during full navigation canceled Next prefetches. Retained trace ZIP; wait for network idle before advancing, retain zero-page-error assertion; focused four-case WebKit rerun exit0.
- R1-cross-browser-final.log:66 PASS/6 timeout; Firefox no-JS returning FontFaceSet.ready across automation did not settle. Reproduction trace retained; explicit polling of loaded state passes and retains no-JS text/navigation assertions. Focused Firefox rerun exit0.
- R1-cross-browser-retest.log:69 PASS/3 artifact errors and R1-demo-e2e.log:11 PASS/1 artifact error. Concurrent configs shared `test-results`; runner cleanup removed the other suite's trace files. Separate `test-results/demo` and `test-results/typography`; final isolated suites exit0. Collision JSON/logs retained.
- After-audit initial harness expected familyName `Nunito`, but the complete600 font's actual family is `Nunito SemiBold`. Final audit matches exact permitted PostScript normal/italic names and requires isCustomFont; no fallback is allowed. A subsequent stale preview/build mismatch returned unstyled fallback; final script starts a fresh isolated built server. Failed audit logs retained.

## Scope limits

- Delayed-font CLS measured only where LayoutShift API exists: Chrome six widths, sums0.000196–0.000421 in final run. Firefox/WebKit API unavailable: **NOT MEASURED**, summary has null, not zero. All engines still test readable loading/failure/no-JS/navigation/overflow and produce screenshots.
- Source font bytes746,028; no new npm dependency. Home loaded5 fonts,623,384 uncompressed/273,505 transferred bytes. Destination/privacy shells4 fonts,495,056 uncompressed/211,146 transferred bytes each. Lighthouse LCP3.922/3.241/2.706s; CLS0.000311/0/0.042579 respectively. Single local samples, not field results. Compared with the historical system-font demo, font bytes/LCP increased and remain a future optimization risk.
- Screenshots are rendered evidence, not approved pixel-diff baselines. Actual wizard/timeline visual regression **NOT RUN** because only shells exist. Physical iOS/Android, full WCAG audit, app feature E2E, Vitest domain/contract/DB/RLS tests, `supabase test db`, CI and live staging/provider checks **NOT RUN**: missing implementations and gate dependencies, no DB changes in this task.
- No release or production smoke tests were run against a live environment.
