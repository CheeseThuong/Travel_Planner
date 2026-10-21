# P00-04 — Content and artwork rights evidence

Reviewed 2026-10-21 by Codex, technical content-source review. User explicitly requested independent open-source research and original illustrations in chat. This is not a third-party photo permission or general legal certification.

## Open-data acquisition and database notice

Thirty real-source editorial draft records use public OpenStreetMap object names/coordinates, with type/id/version and a minimized source snapshot in `sources/osm-selected.json`. The source request URL, bounded query, OSM base timestamp and review date are retained. No Google data, downloaded photos, personal contributor IDs/usernames or contact tags are included in the selected snapshot.

Data attribution: **© OpenStreetMap contributors** — [copyright and license](https://www.openstreetmap.org/copyright). OSM permits reuse subject to attribution and database share-alike requirements. The derived public catalog database is designated **ODbL-1.0**, linked to the [license text](https://opendatacommons.org/licenses/odbl/1-0/). These two primary pages were opened and inspected in this task. No claim is made that ODbL automatically licenses third-party photos, trademarks, the application source or private trip data. See [ADR-0012](../adr/ADR-0012.md) for consequences and implementation requirements before publication.

`places.seed.json` plus the selected snapshot and rebuild code provide the editable source of this derived catalog. Original Vietnamese editorial sentences and suggested dwell times were authored for this project, not copied from tourism prose. No source operating hours/prices/contact details were imported. Each record retains the OSM object URL and source version so later review can detect stale/incorrect facts. Source publication is evidence of an open-data license, not proof of present-day access or factual completeness.

## Original illustrations

Six SVG files in `illustrations/` were authored directly in `scripts/build-editorial-seed.py` in this session. Source consists only of original geometric paths/shapes and a simple mascot; no downloaded photo, font, icon library, logo or traced landmark is used. Creator: Codex, commissioned by project owner in chat 2026-10-21. Permission basis: user-authorized creation and use within this project (`project-original-authorized-use`), not a claim to a registered copyright or a third-party license grant. No external asset dependency/bundle cost.

They are **symbolic category illustrations**, reused across records and explicitly labeled as such in alt text. They are not photographs, accurate depictions of the 30 places, or final P07 city artwork. The user has not selected a public standalone artwork license; no unsolicited MIT/CC0 dedication of user artwork is made. Any public asset redistribution license is a release decision separate from the ODbL catalog database.

## Review limits and acquisition failures

- Wikidata CC0 was evaluated, but one bounded query to its query service returned HTTP 429 with active-outage/rate-limit notice. No immediate retry or restriction workaround used. Wikidata content is not part of this seed.
- A single bounded Overpass request succeeded and produced candidate OSM records. Editorial selection excludes generic/misclassified entries, duplicate representations and contact-bearing names. No runtime dependency on Overpass, Nominatim or map tiles is introduced.
- Timestamps mean source review/acquisition only. All records remain draft, `verification_scope=open_source_identity_coordinates_only`, `hours_unknown`, no verified opening dates. Way/relation locations are geometry centers, not confirmed entrances.
- Island transfer is explicitly manual; remote/cultural/religious/access restrictions remain cautions. Durations are suggestions, not measured dwell times.
- P02 must map this design to migrations and validate draft/publication status. P03 must render data attribution/license links; P07 must do artwork/a11y/visual review. Before publishing a record, content review must confirm identity/entrance/access and retain hours uncertainty unless verified. This P00 artifact meets content-design requirements; it does not certify 30 currently visitable attractions.
