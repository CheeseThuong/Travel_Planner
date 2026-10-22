# P02-04 plan — Concurrency, replay and G2 security closure

TASK: P02-04
STATUS: IN_PROGRESS
SCOPE: complete Phase02 negative access/concurrency/replay evidence and prepare G2 review

ACCEPTANCE:
- P02-04-AC01: two concurrent authenticated owner updates with the same expected version produce exactly one saved version and one `version_conflict`; no partial/mixed payload.
- P02-04-AC02: owner A/B/null/forged auth, private tables, internal RPCs, hashes/provider ledger and direct writes remain denied by repeatable pgTAP/real Auth tests.
- P02-04-AC03: clean migration/seed/test replay succeeds twice and Auth fixture cleanup leaves no test users/trips or published catalog rows.
- P02-04-AC04: full required release subset passes on CI with audit0; evidence and G2 review truthfully separate storage/Auth completion from unimplemented UI/planner/share.

EXPECTED CHANGES: strengthen local Auth integration with actual Promise-all CAS and post-cleanup SQL assertions; CI rerun; P02-04/G2 reports and tracker only. No schema/API/product UI change expected.

DATA/API IMPACT: none beyond exercising the existing optimistic concurrency contract.

TEST PLAN: reproduce concurrent update against reset local DB; require one saved/one conflict; load the winner and delete at version2; cleanup marker users and assert fixture state; run reset/121 pgTAP/Auth/static/build and fresh CI.

ROLLBACK: revert test/report changes. No production or cloud resource exists.

RISKS: flaky timing or a false pass from sequential requests. Launch both promises before awaiting and assert the exact multiset of results plus final stored payload/version.

GATE: G2 NOT VERIFIED until all acceptance and remote evidence pass.
NEXT: implement concurrency/cleanup assertions, verify, push review and prepare G2 review.
