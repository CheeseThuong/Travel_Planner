import type { Coordinates } from "../model/trip";
import type { DestinationSlug } from "../model/destination";
import type { PlaceCategory } from "./place";

export interface ContributionInput {
  readonly destination_slug: DestinationSlug;
  readonly title: string; readonly description: string; readonly address: string | null;
  readonly location: Coordinates; readonly categories: readonly PlaceCategory[]; readonly tags: readonly string[];
  readonly suggested_duration_min: number; readonly transport_constraint: "access_unverified" | "manual_transfer";
  readonly source: "original_user_contribution"; readonly rights_confirmed: true;
}
export const contributionStates = ["submitted", "verification", "approved", "rejected", "withdrawn"] as const;
export type ContributionState = typeof contributionStates[number];
export interface SubmissionSummary {
  readonly id: string; readonly payload: ContributionInput; readonly state: ContributionState; readonly version: number;
  readonly duplicate_hints: readonly { readonly kind: "editorial" | "community"; readonly id: string; readonly certainty: "suspected" }[];
  readonly created_at: string; readonly latest_note: string;
}
export interface CommunityPlace extends Omit<ContributionInput, "rights_confirmed"> {
  readonly id: string; readonly moderation: "community_reviewed"; readonly coordinate_confidence: "user_confirmed";
  readonly hours: { readonly state: "hours_unknown" }; readonly price: { readonly state: "unknown" }; readonly accessibility: "unknown";
}
export const contributionLabels: Readonly<Record<ContributionState, string>> = {
  submitted: "Đã gửi, chờ kiểm tra trùng", verification: "Đang kiểm duyệt", approved: "Đã duyệt đóng góp cộng đồng", rejected: "Từ chối", withdrawn: "Đã rút đóng góp",
};
