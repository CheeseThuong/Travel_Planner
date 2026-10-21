# P01-01-COMPAT — Supported core and explicit compatibility adapters

Status: DONE. Parent P01-01 corrected to DONE; G1 still FAIL pending P01-02..04 and actual CI. Date2026-10-21.

Baseline: only unknown change was generated next-env.d.ts dev imports; no application edits existed. Original10 tooling checks PASS. Plugin peers exclude core10. ADR0017 records reviewed project-maintained alternative, exact licenses, rollback and provenance. No assertion that upstream plugins support10.

Implementation: ESLint10.13.0 + official Apache2 @eslint/compat2.1.1; three MIT plugin snapshots have unchanged rule/config bytes, explicit compat entrypoint and +project.1 metadata. Next-config snapshot points directly at adapters/existing Next glob fix; exactly two redundant Next context wrappers removed. Integrity test reverses only those substitutions and checks original hashes. Global file overrides removed. `npm ci --strict-peer-deps` and actual dependency tree pass; no legacy/force/audit ignore. Dev-only packages have no intentional client imports.

Reproductions/fixes: root install rejected stale peers; clean resolution identified global file-override/optional-peer problem; explicit Next dependency snapshot resolves. Initial snapshot acquisition used an unexported package path and was corrected to entrypoint-relative lookup. Incomplete missing-path lock was not accepted or installed; final lock verified actual snapshot versions/entries before copying. Initial ci EPERM was a workspace dev SWC lock; verified port3000 process stopped, reinstall succeeded. Next's context wrapper masked engine detection and caused official compat to miss10 SourceCode APIs; removed duplicate wrappers with exact-byte reconstruction test. Raw settings compare differed only in resolver hoisting and disabled core no-unused-vars materialized defaults; portable comparison preserves all enabled rule options/severity and module entry identity, historical baseline unchanged.

Additional reproduced build failure: stale `.next/dev/types` plus production generated globals produced duplicate aliases. Build/typecheck now remove only a validated four-file Next-generated dev type cache before normal type generation. No source/test exclusion, ignoreBuildErrors, skipLibCheck or lint suppression added. Dev/build should run separately. Initial cache guard rejected two canonical Next type-header variants, then exact inspected headers were allowlisted. Original generated next-env state changed only through Next generation.

| Command | Exit | Evidence under evidence/ |
|---|---:|---|
| `npm.cmd ci --strict-peer-deps` retry | 0 | P01-COMPAT-ci-install-retry.log |
| `npm.cmd ls eslint --all --json` | 0 | P01-COMPAT-eslint-tree.json; actual core10, valid peers |
| `npm.cmd audit --json --fetch-retries=0` | 0 | P01-COMPAT-audit.json, full audit0 |
| `npm.cmd run test:unit` corrected | 0 | P01-COMPAT-unit-final.log;19 PASS,0 skips |
| `npm.cmd run lint` final | 0 | P01-COMPAT-lint-final.log |
| `npm.cmd run typecheck` | 0 | P01-COMPAT-typecheck.log |
| `npm.cmd run build` final | 0 | P01-COMPAT-build-final.log; prior failures preserved |
| `npm.cmd run test:integration` | 0 | P01-COMPAT-http.log;11 scaffold HTTP checks |
| `npm.cmd run test:e2e` with separate evidence prefix | 0 | P01-COMPAT-browser.log;12 demo checks |

AC-C1..4 PASS. Parent P01-01 AC01..04 now PASS through explicitly reviewed maintained-core/project-adapter option; no phase gate inferred. Full legal/production/db/live tests NOT RUN, no schema change. Risks: project adapter maintenance/revalidation; additional vendor source; warning for Lighthouse transitive deprecated OpenTelemetry and blocked unrs postinstall retained; native prebuilt resolver works in executed lint/tests without bypassing script policy. Next allowed: P01-02, P01-03, P01-04 (all depend only on closed P01-01). Actual G1 CI evidence still needed.
