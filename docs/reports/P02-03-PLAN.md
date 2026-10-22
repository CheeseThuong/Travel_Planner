# P02-03 plan — Verified owner repository and expanded trip input

TASK: P02-03
STATUS: IN_PROGRESS
SCOPE: real anonymous Supabase sessions, server-only verified-owner repository mapping, and persistence contract for party size, trip budget and planning mode from ADR0022

ACCEPTANCE:
- P02-03-AC01: two real local anonymous sessions are verified by Supabase Auth; A can save/load/delete A and cannot read or mutate B; null/forged credentials fail without owner disclosure.
- P02-03-AC02: server construction validates the bearer token with Auth and uses the caller JWT for RLS; no service-role owner repository and no client-provided owner ID.
- P02-03-AC03: TripDraft roundtrips selection order, party size, assisted/manual mode, optional whole-VND budget and bounded user-entered cost estimates through the atomic transaction.
- P02-03-AC04: stale version/idempotency errors map to typed predictable results; provider/Auth errors are redacted and no token appears in evidence.
- P02-03-AC05: strict install/audit/typecheck/lint/unit and actual local reset/DB/Auth integration pass; CI uses only disposable local Supabase and no paid/live provider.

EXPECTED CHANGES: ADR0022/Master/task mappings; additive migration and pgTAP cases; pure budget contract/calculation tests; exact reviewed Supabase SDK dependency; server-only Auth/repository adapter; local Auth integration script and CI step; report/evidence.

DATA/API IMPACT: private trip and stop columns plus owner-save JSON contract. Existing rows get safe defaults. No public owner route, share resolver, provider API or service-role credential is introduced in this task.

TEST PLAN: first add failing domain/DB roundtrip and bounds cases; reset disposable DB; run pgTAP twice; create two anonymous local sessions without printing credentials; exercise owner isolation and version behavior; run applicable baseline commands and review client bundle boundary.

ROLLBACK: drop only the additive migration in a disposable development reset or revert the coherent task commit before deployment. No production database is connected.

RISKS: Auth token leakage, accidental service-role bypass, integer overflow, confusing known estimates with complete cost, migration/RPC drift and manual order loss. Mitigate with in-memory credentials, redacted output, bounded integers, explicit unknown state, clean-reset tests and array-order assertions.

GATE: G2 NOT VERIFIED; P02-04 and formal G2 review remain after this task.
NEXT: implement the failing contract tests and additive migration, then the verified-owner adapter.
