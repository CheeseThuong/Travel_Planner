import { TravelWorkbench } from "@/components/travel-workbench";
import type { CatalogPlace } from "@/domain/catalog";
import nhaTrangSeed from "../../../../docs/content/places.seed.json";
import daLatSeed from "../../../../docs/content/da-lat/places.seed.json";

function places(seed:typeof nhaTrangSeed|typeof daLatSeed):CatalogPlace[] {
  return seed.records.map(record=>({id:record.id,slug:record.slug,title:record.title_vi,category:record.category,description:record.description_vi,durationMinutes:record.recommended_duration_min,lat:record.lat,lng:record.lng,sourceUrl:record.data_source.url}));
}
export default async function NewPlanPage({searchParams}:{searchParams:Promise<{destination?:string}>}) {
  const requested=(await searchParams).destination;
  const initialDestination=requested==="da-lat"?"da-lat":"nha-trang";
  return <TravelWorkbench initialDestination={initialDestination} catalogs={{"nha-trang":places(nhaTrangSeed),"da-lat":places(daLatSeed)}}/>;
}
