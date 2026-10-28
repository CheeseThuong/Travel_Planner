import { filterCatalog, type CatalogPlace } from "@/domain/catalog";
import { parseMapsUrl } from "@/domain/import/maps-url";
import type { DestinationSlug } from "@/domain/model/destination";
import type { PlaceResolution, PlaceResolver } from "@/domain/ports/providers";

/** No network: unsupported/opaque links use manual fallback under ADR-0024. */
export class EditorialPlaceResolver implements PlaceResolver {
  constructor(private readonly catalogs: Readonly<Record<DestinationSlug, readonly CatalogPlace[]>>) {}

  async resolve(input: Readonly<{ url: string; destination_slug: DestinationSlug }>, signal?: AbortSignal): Promise<PlaceResolution> {
    signal?.throwIfAborted();
    const parsed = parseMapsUrl(input.url);
    const matches = parsed.kind === "full" && parsed.query ? filterCatalog(this.catalogs[input.destination_slug], parsed.query, "all").slice(0, 10) : [];
    return {
      status: matches.length ? "candidate_selection_required" : "manual_entry_required",
      candidates: matches.map((place) => ({ provider: "editorial", editorial_place_id: place.id, display_name: place.title, location: { lat: place.lat, lng: place.lng }, confidence: "medium" })),
      manual_entry_available: true,
    };
  }
}
