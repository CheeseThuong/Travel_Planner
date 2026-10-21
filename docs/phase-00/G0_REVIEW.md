# G0 — Review packet

Status: NOT VERIFIED — pending project-owner acceptance of the concrete Phase 00 design and ODbL catalog strategy. Date: 2026-10-21. No Phase 01 task started.

Review basis: Master 18.2 requires “PRD + ADR + license policy + architecture review agreed”; Master Phase 00 exit requires “docs accepted”. The user already approved governance separation (ADR-0000), four scope/contract clarifications (ADR-0011), and independent open-source research/original artwork. This packet does not claim that the user specifically approved ODbL/share-alike or reviewed all deliverables yet.

| Blocking item | Technical evidence | State |
|---|---|---|
| P00-01 scope/non-goals/FR/BR owners | PRD_BASELINE.md; 178 document checks; report P00-01 | DONE |
| P00-02 ADR 01–10, architecture/dependency/build/cost | ADR-0001..0010; ARCHITECTURE_REVIEW.md; document validator/report | DONE |
| P00-03 policies/rights/privacy/terms | Primary sources inspected, signed technical checklist, unpublished notice drafts; validator/report | DONE (technical design scope) |
| P00-04 catalog content design | 30 sourced draft records, minimized OSM versioned source, six original symbolic SVGs, schema/negative checks, rights notice/report | DONE (design, not published content) |
| User-approved baseline ambiguities | ADR-0000/0011; Master wording aligned | ACCEPTED |
| Catalog license strategy and overall G0 docs | ADR-0012; RIGHTS.md; this packet | AWAITING OWNER REVIEW |

## Concrete decision requested

Accept Phase 00 technical design and the OSM-derived catalog database under ODbL-1.0: public catalog must display attribution/license links and make its derived database/editable source available under the required database terms. This does not relicense application code, private trips or original artwork. Six SVGs are original symbolic category illustrations for project use; final landmark/city visuals remain P07. A different data source requires revising P00-04 and revalidating before G0.

Approval allows recording G0 PASS and starting P01-01. It does not authorize live provider billing, public catalog publication or production deployment; these still need their specified gates and controls. Rejection leaves G0 NOT VERIFIED and requires a content-source correction task; never strip attribution or replace with fabricated evidence.

## Evidence and limitations

Repeatable document/content checks: `node scripts/verify-p00-01.mjs`, `node scripts/verify-p00-02.mjs`, `node scripts/verify-p00-03.mjs`, `node scripts/verify-p00-04.mjs`; exact logs under docs/reports/evidence. `python scripts/build-editorial-seed.py` rebuilds offline without network.

Application typecheck/lint/unit/integration/e2e/build: NOT RUN because no app/package scripts exist yet; P01 sets them up. DB tests: NOT RUN because no DB changes. Documentation validation does not prove owner isolation, route accuracy, offline behavior, accessibility or deployment readiness. G1–G8 remain NOT VERIFIED.

All 30 records are draft and source-reviewed only, with unknown hours and unverified entrances/access. P02 must preserve provenance/publication boundaries; P03 must implement attribution and not advertise source uncertainty as verified facts. P08 must finalize controller identity/contact, retention/backups/guest account lifecycle, billing-region-specific terms, numeric budgets, legal notices and real security/deletion/restore checks.

No installed packages, keys, real Maps API calls, remote writes or deployment. Local implementation commit `cc723ee` contains P00-01..04; subsequent evidence bookkeeping may be a separate task-ID commit. Existing technology decisions unchanged.
