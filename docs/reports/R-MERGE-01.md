# R-MERGE-01 ? merge and preview push

STATUS: VERIFYING

Scope: finish the existing merge, preserve README contents from both branches, select incoming generated Docker build metadata, and push a preview branch. No API/schema or dependency changes by this task.

Acceptance: AC1 no unmerged paths/markers; AC2 local checks recorded; AC3 remote preview branch matches commit.

Verification plan: typecheck, lint, unit, build; integration/E2E if local prerequisites permit. No production deployment; G8 NOT VERIFIED.

Rollback: retain original merge parents in Git history; revert the merge commit on the preview branch if needed.

Risk: existing broad staged feature changes are included at user request; these are not individually reimplemented or certified by this merge task.

Checks completed (exit 0): npm.cmd run typecheck; npm.cmd run lint; npm.cmd run test:unit (337 Vitest tests plus tooling); npm.cmd run build; npm.cmd run test:integration. Logs: docs/reports/evidence/R-MERGE-01-*.txt. E2E running. git ls-files -u: empty. Targeted token/private key pattern scan: no matches (not a comprehensive secret audit).

Final verification: npm.cmd run test:e2e -> exit 1: 78 passed, 6 failed (mobile doc-studio/hybrid-preview/hybrid-workbench). See R-MERGE-01-e2e.txt and R-MERGE-01-browser-results.json. STATUS: FAILED for full verification; merge resolution AC1 PASS, checks recorded AC2 PASS, remote publication AC3 pending. Production G8 NOT VERIFIED. Existing test failures are preserved; no assertion/test changes. DB checks NOT RUN: this task changes no database code. Next: correct mobile E2E failures before release approval.
