import { TravelWorkbench } from "@/components/travel-workbench";
import { editorialCatalogSummaries } from "@/adapters/discovery/editorial.server";
export default async function NewPlanPage({searchParams}:{searchParams:Promise<{destination?:string}>}) {
  const requested=(await searchParams).destination;
  const initialDestination=requested==="da-lat"?"da-lat":"nha-trang";
  return <TravelWorkbench initialDestination={initialDestination} catalogs={editorialCatalogSummaries} localDraftId={crypto.randomUUID()}/>;
}
