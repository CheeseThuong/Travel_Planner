# AGENTS.md — Operating Rules for Coding Agents

> Applies to the entire travel-planner repository. MUST READ before any code change.

## Source of truth & precedence

1. User's explicit current request and security/legal obligations.
2. `AGENTS.md` (this file) — process requirements.
3. `docs/MASTER_PLANNER.md` — PRD, architectural decisions, API, schema, algorithm, tests.
4. `docs/WORK_ITEMS.md` — phase tracker, task dependencies, evidence and gates.
5. Existing tested code behavior and ADRs; where contradictory, **do not silently choose**: record a conflict and propose a scoped resolution.

## Non-negotiable rules

- DO NOT skip a failing test, change assertion to false positive, delete tests, suppress security exceptions or disable TypeScript/lint to make a pipeline green.
- DO NOT move to a later phase while its blocking Gate is FAIL or NOT VERIFIED. If blocked, record it and resolve first.
- DO NOT fabricate test results, command logs, feature completion or source inspection. If a test was not run, say `NOT RUN` and why.
- DO NOT blindly rewrite existing working modules. Reproduce problems, isolate root cause and prefer minimal test-driven changes.
- DO NOT add dependencies without justification, security/license review, bundle impact and approval in an ADR when architecture changes.
- DO NOT hardcode API keys/secrets, client-expose service-role keys, log share codes, or persist restricted Google Maps content contrary to applicable terms.
- DO NOT implement unsupported Google Maps links by unsafe network fetching. Allowlist URLs, validate redirects and preserve a manual-entry fallback.
- DO NOT describe approximate travel duration as an accurate route estimate. Expose provenance and uncertainty.
- DO NOT silently drop unscheduled places or rewrite locked stops.
- DO NOT make the chibi/3D experience block core itinerary functions. Respect reduced motion and mobile accessibility.
- DO NOT assume anonymous Supabase sign-in provides permanent recoverable ownership once browser credentials are lost.
- No production deployment until G8 passes. Never use a production environment for automated tests.

## Required working loop per task

**1. Inspect** — Read relevant files, git status, current task, changes not owned by current task, dependency state. If bug: reproduce in test, identify root cause.  
**2. Specify** — Write task ID, acceptance criteria, expected changes, data/API impact, test plan, rollback and risks before modifying code.  
**3. Execute** — Implement one coherent task, follow dependency boundaries. Update or add tests with changes.  
**4. Verify** — Run exact relevant commands; capture exit codes/output and artifact references. Do not extrapolate from mock tests to real production behavior.  
**5. Report** — State modifications, evidence, warnings, task status and Gate status. Update tracker truthfully.

## Task state machine

`TODO -> IN_PROGRESS -> VERIFYING -> DONE`

If blocked: `IN_PROGRESS/VERIFYING -> BLOCKED`; if verification fails: `-> FAILED`. Return to `IN_PROGRESS` only with corrective actions. `DONE` is allowed only after task dependencies are closed and all task acceptance criteria and applicable tests pass with evidence. Phase progression additionally requires the blocking phase Gate to PASS (user-approved clarification: `docs/adr/ADR-0000.md`).

## Gate discipline

- G0: PRD, architecture, data/compliance decisions reviewed.
- G1: scaffold, typecheck, lint, baseline tests.
- G2: migrations, schema checks, RLS & ownership isolation.
- G3: catalog + safe Google URL import + manual fallback.
- G4: deterministic planner, feasibility, no silent drops.
- G5: IndexedDB + save/reload/offline + version conflicts.
- G6: share security, resolve, revoke, rate limiting.
- G7: mobile, accessibility, visuals, performance.
- G8: staging/production smoke tests, operations, legal review, rollback.

Task evidence is mandatory. Manual checks do not replace repeatable tests where automation is feasible.

## Technical boundaries

- `src/domain/**` is pure, deterministic logic; must not import Next.js, React or Google SDK.
- `src/adapters/**` handles external providers and persistence, behind interfaces.
- Every public API input is validated server-side (Zod or equivalent).
- All trip-owned DB operations require verified auth and RLS. Public share views use a narrowly scoped server pathway, never general owner API.
- Use optimistic concurrency `expected_version` for trip mutations.
- Generate produces a candidate; applying a plan is a separate user-confirmed atomic operation.
- For all endpoints, implement predictable error contracts and request IDs, redact sensitive inputs.
- Live external APIs should be mocked in CI with deterministic fixtures. Staging live tests require budget controls.

## Mandatory verification commands (adapt names only if package scripts differ)

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build
```

Run the applicable subset on every change and full release suite before a Gate approval; also run `supabase test db` for RLS/database changes. Record exact commands executed. Set up scripts in Phase 01.

## Required task report

```text
TASK: Pxx-yy
STATUS: TODO | IN_PROGRESS | VERIFYING | DONE | FAILED | BLOCKED
SCOPE: ...
CHANGES: files, behavior, migrations...
TESTS: command -> exit code -> evidence/summary
ACCEPTANCE: AC IDs with PASS/FAIL/NOT RUN
RISK/SECURITY: ...
GATE: Gx -> PASS/FAIL/NOT VERIFIED
NEXT: next allowed task ID (or blocker correction)
```

## Change governance

- Any change to contract/schema/security/engine assumptions must be documented in `docs/adr/ADR-XXXX.md` including context, alternatives, trade-offs, updated test cases.
- Preserve user edits, unknown uncommitted changes and historical data. If repository state is unsafe to mutate, stop modifications and report.
- Maintain a small, reviewable diff and useful commit messages containing task ID.
- No claim of completion based only on code existence; completion requires objective evidence and user-visible behavior.

## Explicit publication override ? 2026-10-31

For R-MAIN-01 only, the user authorizes push to main and its connected Vercel deployment before G8 passes (ADR-0037). Preserve truthful gate status and all security, data-protection and test requirements.
