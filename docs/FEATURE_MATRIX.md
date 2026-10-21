# Feature matrix

Audit date: 2026-10-21. Status describes actual product behavior, not future task completion. Source: `src/app/**`, components, package scripts, HTTP and rendered-browser evidence. Destination/plan screenshots show **skeletons**, not completed journeys.

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
| Transport/preferences/budget | `/plan/new` | Choose mode/pace/interests/activity/breaks | NOT IMPLEMENTED | No model/form/validation | P0 | Preferences bounds, keyboard, daily feasibility |
| Maps full/short URL import | Wizard/import | Safe parser/resolver + candidate confirmation/manual fallback | NOT IMPLEMENTED | No parser, endpoint or adapter | P1 | Allowlist, redirects/private addresses, timeout/rate limits/provider failures |
| Routing/approximate provenance | Generate/editor | Bounded directed matrix with explicit uncertainty | NOT IMPLEMENTED | No RoutingProvider or matrix implementations | P0 | Unreachable legs, quota/timeout/fallback; truthful labels |
| Deterministic itinerary generation | Wizard/editor | Feasible candidate, explicit unscheduled accounting | NOT IMPLEMENTED | No planner/calendar/constraint verifier | P0 | Full Master13 edge cases, properties, locks, p95 benchmark |
| Candidate review/apply | Editor | Separate user-confirmed atomic versioned application | NOT IMPLEMENTED | No plan-run storage/endpoints/model | P0 | Generate does not mutate; stale run/version conflict/atomic rollback |
| Timeline/map editing | `/trips/[tripId]` | Move/reorder/time/lock/delete/regenerate and map | PLACEHOLDER | ComingSoon; no owner data loaded | P1 | Real timeline/keyboard/conflict/map-fallback E2E |
| Local draft autosave/reload/offline | Wizard/editor | Durable IndexedDB drafts/migrations/two-tab conflicts | NOT IMPLEMENTED | No IndexedDB/Dexie/storage adapter; app adds no draft storage | P0 | Reload/reopen/offline/quota/migration/concurrent tabs |
| Cloud ownership and save | Owner API/editor | Verified anonymous owner auth + RLS/versioned transactions | NOT IMPLEMENTED | No Supabase package/project/migrations/auth/owner endpoints | P0 | Actual pgTAP A/B/null/forged owner/transaction tests |
| Create/copy/list/revoke share | Editor | CSPRNG128-bit hash-only view codes | NOT IMPLEMENTED | No token service/database/API/UI | P0 | Entropy/storage/redaction/list/revoke/rate-limit |
| Open existing code | `/open` | Validate code and resolve read-only itinerary | PLACEHOLDER | ComingSoon; no input form/network pathway | P0 | Invalid/revoked/expired code and cross-context valid share |
| Shared view | `/shared` | Fragment → POST → sanitized read-only data | PLACEHOLDER | ComingSoon; no fragment parser or resolver | P0 | No owner data or mutation privilege with share token |
| Privacy/terms | `/privacy`, `/terms` | Accurate implemented-data policy + operator review | PLACEHOLDER | Honest preview disclaimer only; full legal/operational requirements remain | P1 | Data/delete/revoke/retention flows and operator/legal review |
| API `/api/v1/*` | All15 requested endpoints | Validated envelopes/auth/rate-limit/contracts/OpenAPI | PARTIALLY IMPLEMENTED | P01-04 implements health liveness and shared validation/envelope foundation only; all trip/import/share endpoints remain absent | P0 | Health HTTP/envelope and400/422/413/500 privacy helper tests PASS; auth/idempotency/version/rate-limit NOT RUN |
| Staging/prod/monitoring/rollback | Deployment | Separate environments and live bounded integration smoke | BLOCKED | G1 FAIL; G2–G8 unverified; no deploy config/credential setup established | P0 release | Actual CI/staging/live provider/backup/rollback evidence |

No trip form, endpoint, schema, cloud save, share or planner behavior is inferred from HTTP200 on a shell page. The current UI has no hidden functioning backend.
