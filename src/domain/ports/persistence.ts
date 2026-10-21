import type { PlanCandidate, TripDraft } from "../model/trip";

export type SaveResult = Readonly<{ status: "saved"; draft: TripDraft }> | Readonly<{ status: "version_conflict"; current_version: number }>;
export interface DraftRepository {
  load(id: string): Promise<TripDraft | null>;
  save(draft: TripDraft, expected_version: number): Promise<SaveResult>;
  remove(id: string, expected_version: number): Promise<"removed" | "version_conflict">;
}
// Only the future verified-owner server pathway may construct/use this port.
// No client-provided owner_id or public share token is an owner credential.
export interface OwnerTripRepository extends DraftRepository {
  create(draft: TripDraft, idempotency_key: string): Promise<TripDraft>;
  applyPlan(id: string, candidate: PlanCandidate, expected_version: number): Promise<SaveResult>;
}
