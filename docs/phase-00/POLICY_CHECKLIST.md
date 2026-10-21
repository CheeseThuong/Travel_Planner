# P00-03 — Technical policy and licensing review

Review date: 2026-10-21 (Asia/Saigon). Reviewer/signature: Codex coding agent, technical documentation review only. Disposition: checklist design REVIEWED; live providers DISABLED; production/legal approval NOT GIVEN. This signature is not a project-owner or lawyer signature. Billing jurisdiction/customer agreement is unknown; re-review before enabling APIs.

## Primary sources actually inspected

Sources opened through web tool, no live paid API calls. Clause locations below are review notes, not archived copies or an assurance that future terms stay unchanged.

| Source | Inspected material | Review result |
|---|---|---|
| [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) | Caching exceptions; attribution/display; photos/reviews; public notices; regional terms | Place ID exception does not permit copying all fields. Distinguish provider content, preserve Google Maps/third-party attribution; photos/reviews need their author/source controls. Public privacy/terms required before API use |
| [Routes policies](https://developers.google.com/maps/documentation/routes/policies) | Caching exceptions; map and attribution rules; regional terms | Route results are not a freely reusable offline matrix database; attribution/display requirements apply |
| [Place IDs](https://developers.google.com/maps/documentation/places/web-service/place-id) | Overview and ID reuse/refresh guidance | IDs can change; store ID reference, handle invalid/not-found; review aging IDs rather than assuming permanent identity |
| [Service-specific terms](https://cloud.google.com/maps-platform/terms/maps-service-terms) | Applicability; A.2/A.3; Places 14.1–14.3; Routes 19.1–19.3 | Opened page applies outside EEA; billing address must be checked. Places/Routes can be used without map but not with non-Google map under these clauses. Lat/lng temporary-cache exception up to 30 days is not permission to persist all results. Project chooses stricter no-persistent-provider-field default |
| [Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) | Introduction, cross-platform search syntax, encoding | Outbound URLs need no API key; construct with api=1 and encoded input. This is not a general URL import/extraction API |
| [Places billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing) | Billing/key prerequisite; field masks and SKU selection | Minimize fields; no assumed unlimited/free live service. Verify exact SKU price at live-test setup, not from summary examples |
| [Cloud budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets) | Alerts-only vs supported spend-cap budget distinction | Alerts-only is monitoring, not guaranteed spend enforcement; do not assume spend-cap product supports every service. Application quotas/kill switch still required |
| [Supabase anonymous Auth](https://supabase.com/docs/guides/auth/auth-anonymous) | Anonymous user vs anon key, access loss, authenticated role | Anonymous authenticated owner can lose account access across credential loss/device change; share is not recovery of edit rights |
| [Vercel Hobby](https://vercel.com/docs/plans/hobby) | Hobby personal/non-commercial restriction | Recheck commercial plan before release; no deployment or price commitment here |

## Field and persistence policy

| Data / source | Cloud / IndexedDB / logs default | Display / control | Verification owner/task |
|---|---|---|---|
| Editorial title/description/coordinates/hours | Only with independent provenance/license; catalog cache permitted by project rights | Source/check date, unknown hours explicit | Content P00-04/P02-01 |
| User-entered title/base/coordinates | Private owner storage; no precise coordinates/hotel in analytics | Privacy notice, owner delete and clear local | Backend P05/P08-03 |
| Google Place ID | Reference may persist under documented exception; no full response hidden alongside | Runtime resolve; handle changed/missing ID | Adapters P03/P04 |
| Google title/address/lat/lng/hours | No cloud/IDB/catalog persistence by default; no request body logs | Runtime only after applicable terms/display review; user confirmation does not erase provenance | Adapters P03/P05/P08 |
| Google route durations/matrix/polyline | No persisted matrix in cloud/IDB/catalog/fixtures/telemetry | Bounded runtime use only after review; label source; no non-Google map pairing | Adapters P04/P08 |
| Google photos/reviews | Not seed assets, not downloaded for illustration system | Not included in P0 editorial image pipeline; new display use requires attribution/source review | Content P07 |
| Independent image/illustration | Store only with author, source, license/permission evidence and allowed modifications | Required attribution and alt text; no logo/photo copying | Content P00-04/P07 |
| Share code/auth secrets | Plaintext only creation/session pathway; hash stored; redact logs/analytics/referrer | Read-only scope; revoke/expiry/rate limit | Security P06 |

## Signed technical checklist

`REVIEWED` means design control documented, not runtime PASS. Production implementation checks remain NOT RUN until their phases.

- [x] POL-01: Places/Routes/ID policies distinguished, sources inspected, jurisdiction caveat recorded. REVIEWED by Codex 2026-10-21.
- [x] POL-02: Field-level independent/provider provenance, storage defaults and retention boundary documented; no invented blanket cache permission. REVIEWED by Codex 2026-10-21.
- [x] POL-03: Google Maps branding/third-party/author attribution and map pairing must be checked before provider UI is enabled. REVIEWED by Codex 2026-10-21.
- [x] POL-04: Image/data rights require evidence; copyright scraping excluded; P00-04 cannot pass on synthetic fixtures alone. REVIEWED by Codex 2026-10-21.
- [x] POL-05: Draft privacy/terms cover ownership loss, sharing, deletion, local cache, third parties and uncertainty. REVIEWED by Codex 2026-10-21.
- [x] POL-06: Live OFF, minimal field masks, quota/cost preflight and distinct staging/prod controls; CI mocked. REVIEWED by Codex 2026-10-21.
- [x] POL-07: No legal certification claimed; legal identity, contact, actual retention durations, billing region, approved budgets and published notices must be resolved before P08 live/release. REVIEWED by Codex 2026-10-21.

## Explicit deferred checks

P00-04: actual 30–50 record content/asset rights evidence. P01: dependency license/security/version reviews before install. P08: project owner/privacy reviewer must finalize controller identity/contact, retention including backups and abandoned guest accounts, hosting/DPA/jurisdiction obligations, public notices, real delete/revoke/restore tests, billing/account-specific terms and numeric caps. These are prelaunch controls, not statements that legal compliance already PASS. If review finds a baseline incompatibility, stop and create ADR; live providers stay off.
