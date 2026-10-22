export interface CatalogPlace {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly category: string;
  readonly description: string;
  readonly durationMinutes: number;
  readonly lat: number;
  readonly lng: number;
  readonly sourceUrl: string;
}

function searchable(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d");
}

export function filterCatalog(places: readonly CatalogPlace[], query: string, category: string): CatalogPlace[] {
  const needle = searchable(query.trim());
  return places.filter((place) => {
    const matchesCategory = category === "all" || place.category === category;
    const matchesQuery = !needle || searchable(`${place.title} ${place.description}`).includes(needle);
    return matchesCategory && matchesQuery;
  });
}
