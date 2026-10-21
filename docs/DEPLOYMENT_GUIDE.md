# Deployment guide — release blocked

2026-10-21. Target remains Next.js/Vercel + Supabase. **NOT READY FOR PRODUCTION DEPLOYMENT**; G1 PASS, G2–G8 NOT VERIFIED. No deployment performed.

## Current local checks

Use Node24/npm11 matching package engines. On this Windows host use `npm.cmd`. Install the committed lock only after network access is available; do not use force or legacy-peer-deps.

```powershell
$env:NEXT_TELEMETRY_DISABLED='1'
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:unit
npm.cmd run build
npm.cmd run test:integration
npm.cmd run test:e2e
$env:PLAYWRIGHT_BROWSERS_PATH=Join-Path (Get-Location) '.tools/browsers'
node node_modules/playwright/cli.js install firefox webkit
node node_modules/playwright/cli.js test --config playwright.typography.config.mjs
npm.cmd run start -- --port 3392
```

Browser suites start isolated loopback production servers themselves. Build first. Existing demo requires installed Chrome; typography adds Playwright Firefox/WebKit in ignored `.tools/browsers`. Typography source verification uses the already available Python fontTools4.65.0; no Python runtime is part of the deployed app. Stop only servers you start; do not terminate unrelated node processes. Fonts are local assets and do not need Google network access for build/runtime.

## Required implementation before staging

P01 support, test harness, interfaces and server foundation are implemented; actual remote CI run39611614744 passed and G1 is PASS. Next implement/test Supabase migration/auth/RLS G2; complete catalog/import/wizard G3, planner G4, local/cloud persistence G5, sharing G6, a11y/performance G7. Maintain OpenAPI and API security tests. Create separate disposable DB/auth projects for tests/staging; never reset or run automation against production.

Configuration inventory is in [.env.example](../.env.example). P01-04 validates the server flags, paired cloud configuration and opt-in Google key/budget; the cloud and Google adapters are not implemented yet. Copying the file does not configure working integrations. Keep server-only service credentials out of NEXT_PUBLIC variables and client bundles. Verify each build environment explicitly. The health endpoint reports application liveness only.

## G8 release checklist (all NOT RUN)

- Separate development/staging/production Supabase projects and Vercel environments with least-privilege secrets and tested anonymous ownership limitations.
- Reviewed migrations, tested RLS/constraints/atomic transactions, backup export and restore in disposable staging.
- Bounded opt-in live Google smoke with restricted keys, billing/quota limits/alerts, field masks, policy/attribution/retention review and tested failures.
- Verified request correlation/redaction, error monitoring, provider usage monitoring and health endpoint. No logging share tokens or private locations.
- Accurate privacy/terms, operator identity/contact/retention decisions and legal review. Do not claim compliance from a draft policy.
- Full release suite, real supported browser/mobile journey, zero P0/blocking P1, all applicable gates PASS.
- Vercel preview/staging smoke and verified rollback candidate, migration compatibility and data backup/restore evidence.

## Rollback requirements

Before release record immutable last-known-good app/deployment identifiers and schema versions. Prefer backward-compatible additive migrations; do not auto-drop trip data during rollback. For auth/share incidents disable affected mutations/creation, revoke affected shares through audited pathways and preserve owner data. Practice app rollback plus DB recovery on staging, verify create/save/reload/revoke afterward and record timing. These are required procedures, not exercised evidence.

Production deployment requires G8 PASS and the user's explicit final deployment confirmation. No infrastructure or legal approval is inferred from this guide.
