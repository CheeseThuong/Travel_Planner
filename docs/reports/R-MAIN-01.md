# R-MAIN-01

STATUS: DONE
Scope: fix E2E project rate-limit interference and pre-hydration date input loss; publish to main at explicit user request.
AC1 full desktop/mobile E2E passes without disabling rate limits or assertions. AC2 static/unit/build/integration pass. AC3 main remote matches commit.
No API/schema/dependency changes. Test plan: all six baseline commands; database suite NOT RUN because database code unchanged. Rollback: revert task commit then prior merge on main if needed. Risk: G8 remains NOT VERIFIED; user explicitly overrides production publication gate for this update.

Verification completed: npm.cmd run typecheck ->0; npm.cmd run lint ->0; npm.cmd run test:unit ->0 (31 tooling +337 unit tests); npm.cmd run build ->0; npm.cmd run test:integration ->0. Evidence: docs/reports/evidence/R-MAIN-01-*.txt. Existing failing E2E baseline preserved in R-MERGE-01 logs; full corrected E2E running with unchanged assertions. git diff --check ->0.

Final local verification: npm.cmd run test:e2e ->0, 84/84 passed (desktop and mobile), including all six previously failing cases. AC1 PASS, AC2 PASS. AC3 pending actual push; no remote result fabricated in this pre-push report. STATUS: VERIFYING until remote SHA confirmation. G8 NOT VERIFIED under explicit publication override.

Publication evidence: git push origin main ->0; git ls-remote --heads origin main ->0 confirmed 5ab0f7f90f6ccb11d59f6472101560677c6c7bc6 matches local HEAD. AC3 PASS. STATUS: DONE. Vercel acknowledged the commit with pending deployment status; deployment readiness is separate from push completion. G8 remains NOT VERIFIED.
