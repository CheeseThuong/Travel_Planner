# P00-02 — Architecture, build and cost review

Reviewed by: coding agent, 2026-10-21, against Master 0/6/7/8/9/10/13/15/18/23. Review scope: baseline design only; no runtime or deployment certification. ADR-0001..0010 expand the ten existing decisions, without selecting new architecture.

## Dependency review

```text
UI/features -> domain types + client persistence interface
UI -> server API -> auth + validation -> application orchestration
application orchestration -> pure domain / repository / provider interfaces
adapters -> interfaces + external SDK (Google / Supabase / Dexie)
server auth + owner repository -> Postgres RLS
public share resolve -> narrow server resolver -> sanitized view
domain -> model / geo / scheduling only (no SDK, React or Next)
```

Master section 6 arrow `DOMAIN -> DB` is logical service access, not permission for pure src/domain to import a database SDK. Application orchestration wires adapters; P01-03 boundary tests must enforce direction. This follows explicit Master 6.3 and AGENTS technical boundary; no module refactor exists yet.

Review results: pure deterministic domain preserved; external calls isolated; owner verified plus RLS; read-only share does not reuse general owner APIs; server-only secrets; candidate/apply separation; optimistic version and transaction; no secret logging; independent catalog; no live provider requirement for tests. Actual implementation verification: NOT RUN.

Phase dependency: P00 -> G0 -> P01 -> G1 -> P02 -> G2 -> P03 -> G3 -> P04 -> G4 -> P05 -> G5 -> P06 -> G6 -> P07 -> G7 -> P08 -> G8/release approval. Within P00: 01 -> 02; 01 -> 03 -> 04. G0 requires all four tasks and resolved blockers.

## Build constraints

- Strict TypeScript, Next App Router, Tailwind/shadcn, Vitest/Testing Library/Playwright; Supabase pgTAP belongs to P02. No package installed in P00.
- At P01 select exact supported versions, review security advisories/licenses/bundle impact, commit lockfile; document state-management choice in ADR as Master 6.2 requires. Context vs Zustand remains a bootstrap choice, not silently chosen here.
- No persistent workers. Benchmark bounded 1–7 days, <=30 selected, <=8/day, required-first. p95 <=3s applies only prepared matrix <=15 POI, not external network.
- Run typecheck/lint/unit/integration/e2e/build where applicable; full release suite before gate approval once scripts exist. No application commands can run in documentation-only P00; document validators and source reviews are applicable here.
- Design tokens: Master 15 cream/coral/ocean/mint/sunshine/dark and proposed Vietnamese fonts remain draft. AA/asset/license/bundle checks before adoption in P07; motion and 3D never core dependency.
- No production tests/deploy before G8; exact hosting limits, commercial plan, SDK versions and operational support reviewed at their installation/release milestones.

## Cost-control strategy

Default external live calls disabled: no billing request permitted until keys, policy and approved limits exist. No dollar cap is invented. COST-001 requires operations owner to choose monthly/daily spending caps, alerts and per-operation quotas before staging live smoke. Provider budget alert alone is not an application kill switch.

Before any enabled request: validate input/payload/size, rate-limit per authenticated user or bounded anonymous principal, preflight operation count and cost against remaining application budget, timeout and bounded retry, circuit breaker. Fail closed to approximate/manual on quota/provider errors; retain draft. Keys server-only, restricted API scope and separate staging/prod; mocked CI, opt-in bounded staging tests.

Route matrix cost counts elements, not just HTTP requests: full 20x20 is 400 elements. Include base and every actual matrix node in counts; hard cap selected points does not automatically cap matrix nodes. Filter/deduplicate edges, chunk only within verified provider limits; never use dedup as forbidden persistent content caching. Minimal Places field masks; telemetry provider/operation counts, matrix elements, estimated cost and latency only, no coordinates/hotel/share tokens. Daily usage admin/server only. Provider-specific quotas/prices/retention must be reviewed P00-03/P08, not inferred from examples.

## Outstanding review boundaries

SCOPE-001/API-001/API-002/ENGINE-001 were subsequently approved by user and recorded in ADR-0011. No runtime contract implementation exists. P00-02 documentation complete can coexist with G0 NOT VERIFIED; policy/rights evidence still required for phase progression.
