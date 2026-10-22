import { notFound } from "next/navigation";
import { DestinationCatalog } from "@/components/destination-catalog";
import { TravelPostcard } from "@/components/motion/travel-postcard";
import type { CatalogPlace } from "@/domain/catalog";
import { destinations, findDestination } from "@/domain/model/destination";
import nhaTrangSeed from "../../../../docs/content/places.seed.json";
import daLatSeed from "../../../../docs/content/da-lat/places.seed.json";

const seeds = { "nha-trang": nhaTrangSeed, "da-lat": daLatSeed } as const;

export function generateStaticParams() {
  return destinations.map(({ slug }) => ({ slug }));
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = findDestination(slug);
  if (!destination) notFound();
  const seed = seeds[destination.slug];
  const places: CatalogPlace[] = seed.records.map((record) => ({
    id: record.id,
    slug: record.slug,
    title: record.title_vi,
    category: record.category,
    description: record.description_vi,
    durationMinutes: record.recommended_duration_min,
    lat: record.lat,
    lng: record.lng,
    sourceUrl: record.data_source.url,
  }));

  return <>
    <section className="page-shell grid items-center gap-9 py-12 md:grid-cols-2 md:py-16">
      <div><p className="eyebrow mb-4 text-[#68745b]">{destination.eyebrow}</p><h1 className="display-type text-5xl sm:text-6xl">{destination.name}</h1><p className="mt-6 text-lg leading-8 text-[#58675b]">{destination.description}</p><p className="mt-5 text-sm leading-7 text-[#58675b]">Khám phá {places.length} địa điểm từ dữ liệu nguồn mở, lọc theo sở thích rồi bắt đầu kế hoạch riêng.</p></div>
      <TravelPostcard initialTheme={destination.theme} />
    </section>
    <DestinationCatalog destinationSlug={destination.slug} places={places} attribution={seed.attribution} />
  </>;
}
