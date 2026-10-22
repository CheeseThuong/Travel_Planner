# P02-01 — Local catalog database, implementation plan

2026-10-22. Status IN_PROGRESS. Dependencies G1 PASS (actual remote CI), P00-04/05 DONE. Workspace clean apart from this task's previously acquired CLI metadata. No later phase work.

AC01: pinned reviewed Supabase CLI can initialize and run a disposable local database; commands cannot target a linked/remote database. AC02: replayable migration defines destinations/places, timestamps, coordinate/duration/category/status constraints, indexes, foreign keys and RLS. AC03: deterministic seed preserves all 60 original records, IDs, source/license/image/caution metadata, unknown hours and draft status, separated by destination. AC04: actual clean reset, seed replay and pgTAP positive/negative/read/write/isolation checks pass. Drafts never become public by seeding. No claim of G2 or owner/auth implementation.

Changes: dev-only CLI exact pin/lock/scripts; supabase/config.toml, migration, generated SQL seed; offline generator and DB tests; safe local command wrapper and operator instructions. ADR-0019 documents schema mappings and tooling. New schema only; no user data exists and no external environment is linked.

Tests: CLI version/start, guarded local reset twice, `supabase test db`, deterministic seed check, content checks, audit, typecheck/lint/unit. Keep previous app checks; full suite required for G2 approval. Capture exact command exits and logs. Tests must use real Postgres/Supabase, not mocks for permission evidence.

Risks: accidentally resetting shared/remote data, exposing drafts, dropping provenance, CLI/package maintenance. Use unique project ID and ports, local-only guard and no linked project, record container identity, preserve original content snapshots. Rollback task-only files/dependency; stop this project's local containers, never delete unrelated volumes or original catalog sources. Public publication remains a separate content/UI decision; original data files are untouched.
