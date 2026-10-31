# Feature matrix

2026-10-30 current delta: G4 user-approved PASS; Smart Discovery SD01–SD04, SI01–SI03 and UX01-01A DONE in [recorded local scope](reports/SMART-DISCOVERY.md). Ten category/zone filters, source/caution details and on-demand map preserve selection/candidate; known island transfer retains its constraint. Private submission/moderation/approved-public API/UI implemented at `/contribute`, with temporary verified sessions, RLS/audit/quotas. Latest248 units/302 pgTAP twice/Auth8/56 baseline E2E+2 real contribution browsers/72 typography PASS. Groq/hybrid, durable storage/editor/share incomplete; G5–G8 NOT VERIFIED. Earlier rows are historical; WORK_ITEMS tracks current tasks.

## Current inspected state — 2026-10-29

This snapshot supersedes the historical scaffold matrix below. Evidence: [P04-04](reports/P04-04.md), [P04-05/G4 review](reports/P04-05.md). G0–G3 retain PASS; G4 awaits user review; no production readiness claim.

| Feature | Actual behavior / evidence | Remaining work |
|---|---|---|
| Atlas V2 landing/catalog | Existing responsive entry pages,30 sourced drafts per city, name/category filtering and city isolation;38 desktop/mobile checks | Expanded tags/zones/provider discovery; records remain unverified drafts |
| Local assisted/manual workbench | Actual pure deterministic candidate and non-mutating manual validation, required flags, explicit unscheduled reasons, partial-day bounds, approximate provenance, JSON download | Durable editor/save/reload/locks UI and map selection |
| Maps import | HTTPS/exact-host parser, no network fetch, editorial candidate confirmation and manual fallback | Provider Place ID verification/shortlink transport only after reviewed safety/terms boundary |
| Planner/routing | Required-first feasible heuristic, directed matrices, immutable locks, soft/unknown budget handling;160 unit tests including60 generated invariants and provider failures | Optional live adapters and production latency/route accuracy NOT VERIFIED |
| Owner generate/apply | Separate authenticated candidate storage/confirmed atomic versioned apply, idempotency/CAS, stale/tamper rejection, retained selections/flags/locks;160 pgTAP twice and6 real Auth checks | Owner create/load/save/delete HTTP/UI and durable sessions belong to P05 |
| Typography/mobile/keyboard/offline preview |72 installed-browser typography cases,38 desktop/mobile E2E, current local preview offline checks PASS | Physical devices, complete accessibility/G7, durable offline storage/two-tab recovery |
| Expanded discovery/contributions/Groq | TODO; [gated task index](WORK_ITEMS.md#smart-discovery-extension--todo-blocked-by-g4-user-review) | Provider/model/terms/quota decisions, implementation and fixture evidence NOT RUN |
| IndexedDB/cloud editor/sharing | NOT IMPLEMENTED as user journeys; owner DB primitives exist | P05/P06 and their gates; read-only shares cannot recover edit ownership |
| Release/legal/operations | NOT READY | G7/G8, staging/paid-provider budget controls, distributed limits and explicit release approval |

## Historical matrix — retained for audit

Audit date: 2026-10-21. Status describes actual product behavior, not future task completion. Source: `src/app/**`, components, package scripts, HTTP and rendered-browser evidence. Destination/plan screenshots show **skeletons**, not completed journeys.

2026-10-22 update: G1 PASS; P02-01/P02-02 DONE. P02-03 local verification adds party/budget/manual domain and private persistence plus real anonymous owner A/B adapter tests; fresh CI is pending and G2 remains NOT VERIFIED. Runtime catalog/wizard/editor/share routes remain absent, so database/adapter evidence does not open those journeys.

| Feature | Route | Expected Behavior | Current Status | Root Cause | Priority | Required Tests |
|---|---|---|---|---|---|---|
| Brand/home illustration | `/` | Responsive cream/green landing with decorative postcard | WORKING | SSR text/SVG plus optional motion demo exist | P2 | Render/no-JS/reduced-motion/overflow; existing demo suite |
| Hero destination CTA | `/#diem-den` | Navigate to destination choices | WORKING | Real anchor and cards exist; catalog destination remains unfinished | P0 | Click/keyboard/anchor target |
| Destination card navigation | `/destinations/nha-trang`, `/destinations/da-lat` | Open real destination discovery | PARTIALLY IMPLEMENTED | Link routing works; both destinations render descriptions and preparation notices | P0 | Destination selection through catalog, invalid slug404 |
| Vietnamese typography | All current routes | Consistent Vietnamese normal/italic glyphs and wrapping | WORKING in verified scaffold scope after R1-01 (baseline BROKEN) | Replace CDP-proven Georgia/Times fallback with complete local faces; responsive sizing and gentler tracking | P0 | PASS: cmap, actual platform glyphs,72 three-engine/six-width checks,180 rendered screenshots; full future flows NOT RUN |
| Header/footer navigation | All | Usable native links | PARTIALLY IMPLEMENTED | Links work, but open/privacy/terms destinations are placeholders; header wraps on mobile | P0 | Every CTA destination and keyboard/mobile flow |
| Create trip CTA | `/` → `/plan/new` | Start wizard directly | NOT IMPLEMENTED | Home exposes destination anchor only; no trip creation CTA | P0 | Start/create journey |
| Catalog search/categories/pagination | `/destinations/[slug]` | Search/filter distinct real city catalog and inspect places | PLACEHOLDER | No runtime catalog loader/UI/API; 30 sourced drafts per city exist only in docs | P1 | Search/filter/empty/pagination/city isolation/attribution |
| Place detail/food recommendations | Destination catalog | Inspect provenance/uncertainty and add a place | NOT IMPLEMENTED | No place components or detail route/view | P1 | Detail/add/remove/required/duplicate tests |
| Selected/favorite places | Catalog/wizard | Persist selected state without city contamination | NOT IMPLEMENTED | No shared selection state or persistence | P0 | Add/remove/duration/required/reload |
| Trip dates/arrival/departure | `/plan/new` | Validated 1–7-day local calendar | PLACEHOLDER | ComingSoon component; no form | P0 | AC-001, malformed dates, partial days |
| Accommodation/base location | `/plan/new` | Name/address/Maps/manual coordinates and base confirmation | NOT IMPLEMENTED | No wizard fields or resolver | P0 | Coordinate/date validation and temporary-base warning |
| Transport/preferences/party/budget | `/plan/new` | Choose mode/pace,1–30 people, VND budget/costs and see honest per-person/day result | PARTIALLY IMPLEMENTED | Domain math, storage and owner roundtrip local PASS; form/result UI and planner use remain P03/P04 | P0 | AC-016/017, bounds, unknown-cost honesty, keyboard/mobile |
| Personal planning mode | Wizard/editor | Assisted generation or manual date/time/order with non-mutating validation | PARTIALLY IMPLEMENTED | Mode and exact owner persistence local PASS; manual editor/validator remain P03/P04 | P0 | AC-018, overlaps/bounds/order/locks/reload |
| Maps full/short URL import | Wizard/import | Safe parser/resolver + candidate confirmation/manual fallback | NOT IMPLEMENTED | No parser, endpoint or adapter | P1 | Allowlist, redirects/private addresses, timeout/rate limits/provider failures |
| Routing/approximate provenance | Generate/editor | Bounded directed matrix with explicit uncertainty | NOT IMPLEMENTED | No RoutingProvider or matrix implementations | P0 | Unreachable legs, quota/timeout/fallback; truthful labels |
| Deterministic itinerary generation | Wizard/editor | Feasible candidate, explicit unscheduled accounting | NOT IMPLEMENTED | No planner/calendar/constraint verifier | P0 | Full Master13 edge cases, properties, locks, p95 benchmark |
| Candidate review/apply | Editor | Separate user-confirmed atomic versioned application | NOT IMPLEMENTED | No plan-run storage/endpoints/model | P0 | Generate does not mutate; stale run/version conflict/atomic rollback |
| Timeline/map editing | `/trips/[tripId]` | Move/reorder/time/lock/delete/regenerate and map | PLACEHOLDER | ComingSoon; no owner data loaded | P1 | Real timeline/keyboard/conflict/map-fallback E2E |
| Local draft autosave/reload/offline | Wizard/editor | Durable IndexedDB drafts/migrations/two-tab conflicts | NOT IMPLEMENTED | No IndexedDB/Dexie/storage adapter; app adds no draft storage | P0 | Reload/reopen/offline/quota/migration/concurrent tabs |
| Cloud ownership and save | Owner API/editor | Verified anonymous owner auth + RLS/versioned transactions | NOT IMPLEMENTED | Catalog-only CLI/config/migration exist; no private trip/auth/owner endpoints | P0 | Actual pgTAP A/B/null/forged owner/transaction tests |
| Create/copy/list/revoke share | Editor | CSPRNG128-bit hash-only view codes | NOT IMPLEMENTED | No token service/database/API/UI | P0 | Entropy/storage/redaction/list/revoke/rate-limit |
| Open existing code | `/open` | Validate code and resolve read-only itinerary | PLACEHOLDER | ComingSoon; no input form/network pathway | P0 | Invalid/revoked/expired code and cross-context valid share |
| Shared view | `/shared` | Fragment → POST → sanitized read-only data | PLACEHOLDER | ComingSoon; no fragment parser or resolver | P0 | No owner data or mutation privilege with share token |
| Privacy/terms | `/privacy`, `/terms` | Accurate implemented-data policy + operator review | PLACEHOLDER | Honest preview disclaimer only; full legal/operational requirements remain | P1 | Data/delete/revoke/retention flows and operator/legal review |
| API `/api/v1/*` | All15 requested endpoints | Validated envelopes/auth/rate-limit/contracts/OpenAPI | PARTIALLY IMPLEMENTED | P01-04 implements health liveness and shared validation/envelope foundation only; all trip/import/share endpoints remain absent | P0 | Health HTTP/envelope and400/422/413/500 privacy helper tests PASS; auth/idempotency/version/rate-limit NOT RUN |
| Staging/prod/monitoring/rollback | Deployment | Separate environments and live bounded integration smoke | BLOCKED | G1 PASS; G2–G8 unverified; no staging/production setup verified | P0 release | Actual CI/staging/live provider/backup/rollback evidence |

No trip form, endpoint, schema, cloud save, share or planner behavior is inferred from HTTP200 on a shell page. The current UI has no hidden functioning backend.
