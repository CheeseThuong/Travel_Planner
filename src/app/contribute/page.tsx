import { DocContributionHealth } from "@/components/doc-contribution-health";
import { ContributionWorkspace } from "@/components/contribution-workspace";
import { DocGTrackBatch } from "@/components/doc-gtrack-batch";
import { parseServerEnv } from "@/lib/config/env.server";

export default async function ContributePage({ searchParams }: { searchParams: Promise<{ destination?: string }> }) {
  const destination = (await searchParams).destination === "nha-trang" ? "nha-trang" : "da-lat";
  return <><div className="atlas-container"><DocGTrackBatch /><DocContributionHealth /></div><ContributionWorkspace initialDestination={destination} enabled={parseServerEnv().CLOUD_ENABLED}/></>;
}
