# Known limitations — NOT READY

2026-10-21. P0/P1 product features remain unimplemented; see [feature matrix](FEATURE_MATRIX.md). Existing destination/wizard/editor/open/shared/privacy/terms pages are skeletons. No trip is created, saved, recovered, routed or shared. Do not use this preview for a real itinerary or claim cloud durability.

- G1 FAIL: ESLint9 EOL; compatible current Next React/a11y/import plugins do not advertise ESLint10 support. Full npm audit0 does not resolve that support blocker. P01 baseline tasks and G2–G8 are not complete.
- No database/auth/RLS or cloud services are configured/verified. UUID routes expose no data today, which is not ownership isolation evidence.
- All60 editorial records remain sourced drafts with unknown hours/access/entrance accuracy. Publication, venue verification and full release legal review remain open.
- Typography uses six complete licensed local TTF faces, totaling746,028 raw bytes before HTTP compression. No app dependency added. Measured home font transfer273,505 bytes; other two tested shells211,146. Local mobile Lighthouse Performance84/91/94, LCP3.922/3.241/2.706s; CLS <=0.043. Font payload/LCP increased versus historical system fonts; WOFF2 optimization may be considered separately with coverage/license regression. These measurements do not complete G7.
- Browser automation is desktop Windows Chrome/Playwright Firefox/WebKit at emulated widths. It is not physical iOS/Android testing or a full WCAG audit. LayoutShift API support varies; unsupported browsers must not be reported as measured zero CLS.
- Rendered screenshots capture current shells. Pixel-diff approval baselines, actual wizard/timeline visual regression and complete create/save/share journeys remain NOT RUN until those features exist.
- No live Google Places/Routes, staging/production smoke, CI, backup restore, operational monitoring or production deployment was performed. Missing staging credentials are future release blockers; do not put secrets in reports/chat/source.
