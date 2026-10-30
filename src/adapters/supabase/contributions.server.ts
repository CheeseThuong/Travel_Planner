import { z } from "zod";
import { contributionSchema } from "@/lib/validation/contribution";
import { contributionStates, type ContributionInput } from "@/domain/discovery/contribution";
import { placeCategories, type PlaceCategory } from "@/domain/discovery/place";

export type ContributionConfig = Readonly<{ url: string; publishableKey: string }>;
export class ContributionAccessError extends Error {
  constructor(readonly code: "unauthorized" | "forbidden" | "invalid_input" | "rate_limited" | "unavailable") { super(code); }
}
const id = z.uuid(), state = z.enum(contributionStates);
const hint = z.strictObject({ kind: z.enum(["editorial", "community"]), id, certainty: z.literal("suspected") });
export const submissionRowSchema = z.strictObject({ id, payload: contributionSchema, state, version: z.number().int().positive(), duplicate_hints: z.array(hint).max(10), created_at: z.iso.datetime({ offset: true }), place_submission_events: z.array(z.strictObject({ note: z.string().max(1000), version: z.number().int().positive() })).max(1) }).transform(({ place_submission_events, ...row }) => ({ ...row, latest_note: place_submission_events[0]?.note ?? "" }));
export type SubmissionRow = z.infer<typeof submissionRowSchema>;
export const communityRowSchema = z.strictObject({
  id, destination_slug: z.enum(["nha-trang", "da-lat"]), title: z.string().max(160), description: z.string().max(1000), address: z.string().max(300).nullable(),
  location: z.strictObject({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }), categories: z.array(z.enum(Object.keys(placeCategories) as [PlaceCategory, ...PlaceCategory[]])).min(1).max(5), tags: z.array(z.string().max(32)).max(10),
  suggested_duration_min: z.number().int().min(15).max(720), transport_constraint: z.enum(["access_unverified", "manual_transfer"]),
  source: z.literal("original_user_contribution"), moderation: z.literal("community_reviewed"), coordinate_confidence: z.literal("user_confirmed"),
  hours: z.strictObject({ state: z.literal("hours_unknown") }), price: z.strictObject({ state: z.literal("unknown") }), accessibility: z.literal("unknown"),
});
export const contributionMutationSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.enum(["submitted", "replayed", "duplicate", "updated"]), id, version: z.number().int().positive(), state }),
  z.strictObject({ status: z.literal("version_conflict"), current_version: z.number().int().positive() }),
  z.strictObject({ status: z.enum(["not_found", "idempotency_conflict", "rate_limited", "transition_denied"]) }),
]);
export type ContributionMutation = z.infer<typeof contributionMutationSchema>;

/** Fixed provider paths, no redirects/cache, bounded reads and redacted errors. */
async function call(config: ContributionConfig, token: string | null, path: string, body?: unknown): Promise<unknown> {
  let response: Response;
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const base = new URL(config.url);
    if (!/^https?:$/.test(base.protocol) || base.username || base.password || base.search || base.hash) throw new ContributionAccessError("unavailable");
    response = await fetch(new URL(path, `${base.origin}/`), { method: body === undefined ? "GET" : "POST", headers: { apikey: config.publishableKey, ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: "no-store", redirect: "error", signal: controller.signal });
    if (!response.ok) throw new ContributionAccessError(response.status === 401 || (response.status === 403 && path === "/auth/v1/user") ? "unauthorized" : response.status === 403 ? "forbidden" : response.status === 400 ? "invalid_input" : response.status === 429 ? "rate_limited" : "unavailable");
    const reader = response.body?.getReader();
    if (!reader) throw new ContributionAccessError("unavailable");
    const decoder = new TextDecoder(); let text = "", size = 0;
    try {
      while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 500_000) throw new ContributionAccessError("unavailable"); text += decoder.decode(part.value, { stream: true }); }
      return JSON.parse(text + decoder.decode()) as unknown;
    } finally { await reader.cancel().catch(() => {}); }
  } catch (error) { if (error instanceof ContributionAccessError) throw error; throw new ContributionAccessError("unavailable"); }
  finally { clearTimeout(timer); }
}
function validated<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value); if (!result.success) throw new ContributionAccessError("unavailable"); return result.data;
}
export async function createContributionSession(config: ContributionConfig): Promise<string> {
  const body = await call(config, null, "/auth/v1/signup", {});
  return validated(z.object({ access_token: z.string().min(1).max(8192) }), body).access_token;
}
export async function verifiedContributions(config: ContributionConfig, token: string) {
  if (!/^[^\s;]{1,8192}$/.test(token)) throw new ContributionAccessError("unauthorized");
  const user = validated(z.object({ id, is_anonymous: z.boolean().optional() }), await call(config, token, "/auth/v1/user"));
  const capability = validated(z.strictObject({ moderator: z.boolean() }), await call(config, token, "/rest/v1/rpc/contribution_session_info", {}));
  return {
    moderator: capability.moderator,
    async list(destination: string, review = false, offset = 0): Promise<SubmissionRow[]> {
      if (review && !capability.moderator) throw new ContributionAccessError("forbidden");
      const params = new URLSearchParams({ select: "id,payload,state,version,duplicate_hints,created_at,place_submission_events(note,version)", destination_slug: `eq.${destination}`, order: "created_at.desc,id", limit: "20", offset: String(offset), "place_submission_events.order": "version.desc", "place_submission_events.limit": "1" });
      if (!review) params.set("owner_id", `eq.${user.id}`);
      return validated(z.array(submissionRowSchema).max(20), await call(config, token, `/rest/v1/place_submissions?${params}`));
    },
    async submit(payload: ContributionInput, key: string): Promise<ContributionMutation> {
      return validated(contributionMutationSchema, await call(config, token, "/rest/v1/rpc/submit_place", { p_payload: payload, p_idempotency_key: key }));
    },
    async transition(submissionId: string, expectedVersion: number, action: string, note: string): Promise<ContributionMutation> {
      return validated(contributionMutationSchema, await call(config, token, "/rest/v1/rpc/transition_place_submission", { p_id: submissionId, p_expected_version: expectedVersion, p_action: action, p_note: note }));
    },
  };
}
export async function communityPlaces(config: ContributionConfig, destination: string, offset: number) {
  return validated(z.array(communityRowSchema).max(20), await call(config, null, "/rest/v1/rpc/list_community_places", { p_destination_slug: destination, p_limit: 20, p_offset: offset }));
}
