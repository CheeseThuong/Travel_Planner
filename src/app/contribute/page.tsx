import { ContributionWorkspace } from "@/components/contribution-workspace";
import { parseServerEnv } from "@/lib/config/env.server";

export default async function ContributePage({ searchParams }: { searchParams: Promise<{ destination?: string }> }) {
  const destination = (await searchParams).destination === "nha-trang" ? "nha-trang" : "da-lat";
  return <ContributionWorkspace initialDestination={destination} enabled={parseServerEnv().CLOUD_ENABLED}/>;
}
