import { z } from "zod";
import type { HybridPreview } from "@/application/planning/hybrid";
import { tripDraftSchema } from "@/lib/validation/trip-draft";
import { discoveryPreferencesSchema } from "@/lib/validation/discovery-preferences";
import { discoveryItemSchema } from "./discovery-schema.server";

export const hybridInputSchema = z.strictObject({ draft: tripDraftSchema, preferences: discoveryPreferencesSchema.default({ interests: [], required_place_ids: [], excluded_place_ids: [], zone: "all", auto_suggest: true, food_preference: "any", accommodation_preference: "any", time_of_day: "any" }), use_ai: z.boolean().default(false), use_provider: z.boolean().default(false), seed: z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER).default(42) });
export const transientDiscoverySchema=z.strictObject({retention:z.literal("request_only"),saving_allowed:z.literal(false),places:z.array(discoveryItemSchema.omit({duplicate_confirmation_required:true})).max(100)});
const id = z.uuid(), date = z.iso.date(), time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/), minute = z.number().int().min(0).max(1440);
const warning = z.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/), warnings = z.array(warning).max(100), estimate = z.enum(["approximate", "google_routes"]);
const unscheduled = z.array(z.strictObject({ stop_id: id, reason: z.enum(["CLOSED", "TIME_WINDOW", "TRAVEL_TOO_LONG", "CAPACITY", "UNREACHABLE", "DUPLICATE", "OUT_OF_AREA", "LOCK_CONFLICT", "UNKNOWN"]), message: warning })).max(30);
const safeInteger = z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
const budget = z.strictObject({ status: z.enum(["no_budget", "within_known_budget", "over_budget", "incomplete_estimate"]), total_budget_vnd: safeInteger.nullable(), known_estimated_spend_vnd: safeInteger.nonnegative(), remaining_known_budget_vnd: safeInteger.nullable(), budget_per_person_vnd: safeInteger.nullable(), available_per_group_day_vnd: safeInteger.nullable(), available_per_person_day_vnd: safeInteger.nullable(), unknown_cost_count: z.number().int().min(0).max(30) });
const elements = z.number().int().min(0).max(961).nullable();
const candidate = z.strictObject({ plan_run_id: id, input_version: z.number().int().positive(), engine_version: z.literal("planner-v1"), seed: safeInteger,
  days: z.array(z.strictObject({ date, breaks: z.array(z.strictObject({ start_local: time, end_local: time })).max(2), stops: z.array(z.strictObject({ stop_id: id, start_local: time, end_local: time, travel_departure_local: time, arrival_local: time, rest_before_minutes: minute, travel_from_previous_minutes: minute, estimate_source: estimate, warnings })).max(4), return_leg: z.strictObject({ departure_local: time, arrival_local: time, duration_minutes: minute, estimate_source: estimate }).optional() })).min(1).max(7),
  unscheduled, warnings, unfulfilled_required: z.array(id).max(30), budget, score: z.strictObject({ scheduled_required: z.number().int().min(0).max(30), scheduled_optional: z.number().int().min(0).max(30), travel_minutes: safeInteger.nonnegative(), wait_minutes: safeInteger.nonnegative() }),
  diagnostics: z.strictObject({ feasibility: z.enum(["tentative", "feasible"]), matrix_elements_requested: elements, matrix_elements_reserved: z.number().int().min(1).max(961), routing_sources: z.array(estimate).max(2) }),
});
export const hybridPreviewSchema: z.ZodType<HybridPreview> = z.strictObject({
  preview_only: z.literal(true), requires_confirmation: z.literal(true), empty: z.boolean(), candidate_draft: tripDraftSchema,
  planning: z.discriminatedUnion("status", [z.strictObject({ status: z.literal("candidate"), candidate, unscheduled }), z.strictObject({ status: z.literal("conflict"), candidate: z.null(), conflicts: z.array(z.strictObject({ stop_id: id, message: warning })).min(1).max(30), unscheduled })]),
  original_stop_ids: z.array(id).max(30), suggested_places: z.array(discoveryItemSchema.omit({ geo: true, duplicate_confirmation_required: true })).max(30), external_confirmation_count: z.number().int().min(0).max(100),
  filtered_candidates: z.array(z.strictObject({ id: z.string().max(160), reason: z.enum(["INVALID_LOCATION", "OTHER_CITY", "NOT_A_VISIT", "SOURCE_REQUIRES_CONFIRMATION", "UNREVIEWED_CONTRIBUTION", "DUPLICATE_REQUIRES_CONFIRMATION", "DURATION_UNKNOWN", "USER_EXCLUDED", "INTEREST_MISMATCH", "OUTSIDE_ZONE", "OUTSIDE_TOLERANCE", "MANUAL_TRANSFER_REQUIRED", "RANKING_WINDOW_LIMIT"]) })).max(130), duplicates_removed: z.number().int().min(0).max(129),
  warnings, ranking_source: z.enum(["deterministic", "groq"]), usage: z.strictObject({ discovery_requests_attempted: z.number().int().min(0).max(1).nullable(), ranking_requests_attempted: z.number().int().min(0).max(1).nullable(), matrix_elements_requested: elements }),
});
