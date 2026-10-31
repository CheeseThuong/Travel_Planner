import { notFound } from "next/navigation";
import { DestinationCatalog } from "@/components/destination-catalog";
import { TravelPostcard } from "@/components/motion/travel-postcard";
import type { CatalogPlace } from "@/domain/catalog";
import { destinations, findDestination } from "@/domain/model/destination";
import nhaTrangSeed from "../../../../docs/content/places.seed.json";
import daLatSeed from "../../../../docs/content/da-lat/places.seed.json";

const seeds = { "nha-trang": nhaTrangSeed, "da-lat": daLatSeed } as const;
export function generateStaticParams() { return destinations.map(({ slug }) => ({ slug })); }

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = findDestination(slug);
  if (!destination) notFound();
  const seed = seeds[destination.slug];
  const places: CatalogPlace[] = seed.records.map((record) => ({
    id: record.id, slug: record.slug, title: record.title_vi, category: record.category,
    description: record.description_vi, durationMinutes: record.recommended_duration_min,
    lat: record.lat, lng: record.lng, sourceUrl: record.data_source.url,
  }));
  return <>
    <section className="page-shell city-hero" aria-labelledby="city-title">
      <div><p className="eyebrow text-[#bd5941]">Lật sổ · {destination.eyebrow}</p><h1 id="city-title" className="display-type">{destination.name}</h1><p className="mt-7 max-w-lg">{destination.description}</p><p className="mt-5 text-sm">{places.length} địa điểm có dẫn nguồn. Tọa độ, thời gian và điều kiện tiếp cận có thể chưa được xác minh tại thực địa.</p></div>
      <div className="postcard"><TravelPostcard initialTheme={destination.theme} /><div className="postcard-under"><strong>Chốn đã chọn</strong><small>VIỆT NAM / KÝ SỰ</small></div></div>
    </section>
    <DestinationCatalog destinationSlug={destination.slug} places={places} attribution={seed.attribution} />
  </>;
}
