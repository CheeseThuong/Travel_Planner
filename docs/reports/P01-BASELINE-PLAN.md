# P01-02..04 — Remaining foundation tasks, planned before implementation

2026-10-21. P01-01 corrected/DONE with evidence in P01-01-COMPAT. G1 remains FAIL until these tasks and actual CI pass. Sibling tasks depend on P01-01 and can be prepared independently within Phase01; do not start P02 before G1.

## P01-02, IN_PROGRESS

Add Vitest5.0.5 MIT (Node^24 accepted), Testing Library React16.3.3 MIT (React19 accepted), DOM10 current MIT, jsdom30.1.3 MIT (Node24.19 accepted), reviewed exact pins/lock/full audit. Dev-only, no client imports. Preserve19 Node tooling tests and12 Playwright regressions. Add deterministic Nha Trang/Đà Lạt synthetic fixtures clearly isolated as tests; directed matrix/time-window/unsafe URL fixture inventory per Master18.1. Unit harness verifies fixture integrity/determinism; real UI component test verifies native/asChild Button keyboard/disabled semantics. Use jsdom project only for UI tests. AC02-1 framework/fixtures usable offline; AC02-2 existing tooling/browser checks retained; AC02-3 meaningful component/fixture baseline and coverage reporting pass. Rollback task-only dev deps/config/tests; no app data/API migration.

## P01-03, TODO

Add pure domain model and provider/persistence interfaces for single-destination trips, candidate plans, locks, directed matrix/unreachable/provenance and expected_version; deterministic fixture adapters outside domain. No actual optimizer/auth/storage implementations in this task. Enforce domain imports through lint restrictions and repeatable source boundary test. AC03-1 types capture reviewed Master constraints without SDK dependency; AC03-2 fixture adapters deterministic; AC03-3 forbidden framework/SDK imports fail. Document contract if any departure; retain canonical snake_case API and trip_plan_runs. Rollback only new interfaces/adapters/tests.

## P01-04, TODO

Add Zod4.6.7 MIT for server env/input foundation, flags default live/cloud OFF, fail-safe partial/production env validation. Server-only sensitive values; no client imports. Request ID/error envelopes, structured privacy-safe telemetry allowlist and bounded JSON parsing. Health liveness route contains no infrastructure details. Add CI workflow running actual local-only build/static/unit/HTTP/browser baseline, no live providers or production data. AC04-1 missing/partial/unsafe env rejected while no-key local startup works; AC04-2 sensitive values/URLs/tokens not returned/logged; AC04-3 request IDs/validation/error/health contracts verified; AC04-4 actual remote CI result needed for G1. Rollback files/workflow and package pin, preserve previous app/data. Risks: redaction bypass, build env differences, CI access; test negative cases.

Dependency review: registry engines/licenses read before installing. Vitest/Testing Library/jsdom are dev-only and Zod is imported server-only here; measure resulting bundle/audit/license tree. No new state framework, Maps SDK, persistent service or hosting change. No user secrets required for this baseline.
