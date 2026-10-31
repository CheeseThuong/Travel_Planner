import { notFound } from "next/navigation";
import Link from "next/link";
import { DestinationCatalog } from "@/components/destination-catalog";
import type { CatalogPlace } from "@/domain/catalog";
import { destinations,findDestination } from "@/domain/model/destination";
import nhaTrangSeed from "../../../../docs/content/places.seed.json";
import daLatSeed from "../../../../docs/content/da-lat/places.seed.json";
const seeds={"nha-trang":nhaTrangSeed,"da-lat":daLatSeed} as const;
export function generateStaticParams(){return destinations.map(({slug})=>({slug}));}
export default async function DestinationPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;const city=findDestination(slug);if(!city)notFound();
  const seed=seeds[city.slug];const places:CatalogPlace[]=seed.records.map(record=>({id:record.id,slug:record.slug,title:record.title_vi,category:record.category,description:record.description_vi,durationMinutes:record.recommended_duration_min,lat:record.lat,lng:record.lng,sourceUrl:record.data_source.url}));
  return <><section className="atlas-cityhead"><div className="atlas-container"><p className="atlas-kicker">ĐỊA ĐIỂM / VIỆT NAM / {city.slug.toUpperCase()}</p><h1>{city.name}<span className="atlas-citydot">.</span></h1><div className="atlas-citybottom"><p>{city.description}</p><div><span>30</span><small>ĐỊA ĐIỂM CÓ NGUỒN<br/>CHƯA XÁC MINH GIỜ MỞ CỬA</small></div><Link href={`/plan/new?destination=${city.slug}`}>LẬP TUYẾN TẠI ĐÂY ↗</Link></div></div></section><DestinationCatalog destinationSlug={city.slug} places={places} attribution={seed.attribution}/></>;
}
