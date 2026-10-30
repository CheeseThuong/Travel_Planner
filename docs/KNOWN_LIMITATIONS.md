# Known limitations — NOT READY

## Current limitations — 2026-10-30

G4 is user-approved PASS. Discovery/category/zone API, conservative dedup, safe no-fetch Maps fallback/name search, on-demand OSM map and UI-A are implemented in fixture/no-key scope; [evidence](reports/SMART-DISCOVERY.md). Brave stays OFF by default; live paid use/actual OSM availability NOT RUN. All60 original source records remain drafts with unknown hours/prices/access. Empty categories honestly show no sourced records. Island transfers stay unscheduled with a reason.

Contribution storage/moderation/API/UI now pass local Auth/DB/browser checks at `/contribute`:248 units/302 pgTAP twice/Auth8/56 E2E+2 actual contribution browsers/72 typography. Anonymous access cookie is temporary, browser-session-only with no refresh/recovery; no permanent ownership claim. No application moderator is automatically seeded. Lists have bounded20-item paging through offset1000, not a concurrent-write snapshot. Production moderators, proxy trust/domain controls, retention/legal review and distributed anti-abuse remain unverified. Groq/hybrid, durable local/cloud editing/share and G5–G8 are incomplete. No production/new remote CI, full WCAG/physical-phone/production-performance claim. This entry supersedes historical G4/discovery/contribution TODO status below.

## Current limitations — 2026-10-29

The old scaffold-only statements below are historical. The existing Atlas V2 now runs local assisted previews/manual validation with explicit approximate travel and unscheduled places. Owner candidate/apply APIs pass local Auth/RLS/transaction tests; they do not constitute a durable user-facing cloud editor. [Evidence and G4 review](reports/P04-05.md).

- G4 remains NOT VERIFIED pending user review; G5–G8 are not approved. No production deployment or new remote CI was performed.
- Brave/Groq, expanded tags/geo-zones, safe live shortlink expansion, interactive map selection and community moderation remain gated TODO tasks per ADR0030.
- No IndexedDB autosave/reload, two-tab recovery, owner save/editor journey or secure share viewer exists. JSON download is a manual export. Losing anonymous credentials can lose editing ownership.
- All60 editorial places remain sourced drafts. Hours, prices, entrances and access are not newly verified. Approximate travel uses coordinates/heuristic speeds, not measured road or traffic ETA; no island/boat route is inferred.
- Local160-unit/160-pgTAP/6-Auth/38-E2E/72-typography results and synthetic performance measurements establish only their stated scope. Physical phones, full WCAG, production performance, provider terms/cost and release operations are NOT VERIFIED.
- Process-local request limits need distributed protection before production. Existing pre-task dependency/Atlas/package edits were preserved; their presence is not new dependency approval.

## Historical limitations — retained for audit

2026-10-21. P0/P1 product features remain unimplemented; see [feature matrix](FEATURE_MATRIX.md). Existing destination/wizard/editor/open/shared/privacy/terms pages are skeletons. No trip is created, saved, recovered, routed or shared. Do not use this preview for a real itinerary or claim cloud durability.

- ESLint support corrected by ADR0017: core10 plus explicit repository-maintained compatibility adapters, original rule checks retained, strict peer tree/full audit0. Upstream plugin peer claims are unchanged; project snapshots require maintenance. G1 PASS with actual CI run39611614744; G2–G8 are not complete.
- P02-01 catalog schema/RLS/seeds passed actual Ubuntu local-Supabase CI (42pgTAP twice). Windows host stack is not yet verified because its image download is pending. No trip schema/auth/owner/cloud service is implemented or verified; catalog read policies do not prove private trip isolation.
- All60 editorial records remain sourced drafts with unknown hours/access/entrance accuracy. Publication, venue verification and full release legal review remain open.
- Typography uses six complete licensed local TTF faces, totaling746,028 raw bytes before HTTP compression. No app dependency added. Measured home font transfer273,505 bytes; other two tested shells211,146. Local mobile Lighthouse Performance84/91/94, LCP3.922/3.241/2.706s; CLS <=0.043. Font payload/LCP increased versus historical system fonts; WOFF2 optimization may be considered separately with coverage/license regression. These measurements do not complete G7.
- Browser automation is desktop Windows Chrome/Playwright Firefox/WebKit at emulated widths. It is not physical iOS/Android testing or a full WCAG audit. LayoutShift API support varies; unsupported browsers must not be reported as measured zero CLS.
- Rendered screenshots capture current shells. Pixel-diff approval baselines, actual wizard/timeline visual regression and complete create/save/share journeys remain NOT RUN until those features exist.
- No live Google Places/Routes, staging/production smoke, backup restore, operational monitoring or production deployment was performed. P01 baseline adds health/env/error/privacy controls; actual remote CI PASS for b91d1a8. Local Docker daemon29.8.2 started successfully. Missing staging credentials are future release blockers; do not put secrets in reports/chat/source.
