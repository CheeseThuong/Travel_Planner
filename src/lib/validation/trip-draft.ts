import { z } from "zod";
import type { TripDraft } from "@/domain/model/trip";
import { draftIssues } from "@/domain/trip-draft";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), amount = z.number().int().min(0).max(1_000_000_000_000);
const destination = z.enum(["nha-trang", "da-lat"]), location = z.strictObject({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
const hours = z.discriminatedUnion("state", [z.strictObject({ state: z.literal("hours_unknown") }), z.strictObject({ state: z.literal("verified_editorial"), checked_at: z.iso.datetime({ offset: true }), source: z.string().min(1).max(2048), intervals: z.array(z.strictObject({ weekday: z.number().int().min(0).max(6), start_local: time, end_local: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/) })).max(42) })]);
const cost = z.discriminatedUnion("provenance", [z.strictObject({ provenance: z.literal("unknown") }), z.strictObject({ provenance: z.literal("user_entered"), amount_vnd: amount, applies_to: z.enum(["group", "per_person"]) })]);
export const tripDraftSchema: z.ZodType<TripDraft> = z.strictObject({
  id: z.uuid(), version: z.number().int().min(1).max(2147483645), destination_slug: destination, title: z.string().trim().min(1).max(120), timezone: z.literal("Asia/Ho_Chi_Minh"),
  start_date: z.iso.date(), end_date: z.iso.date(), arrival_local_time: time, departure_local_time: time,
  base_location: location.extend({ label: z.string().trim().min(1).max(200), temporary: z.boolean() }), transport_mode: z.enum(["walk", "motorbike", "drive"]), pace: z.enum(["relaxed", "balanced", "active"]), party_size: z.number().int().min(1).max(30), planning_mode: z.enum(["assisted", "manual"]),
  budget: z.strictObject({ currency: z.literal("VND"), total_vnd: amount.nullable(), known_costs_vnd: z.strictObject({ lodging: amount, transport: amount, meals: amount, other: amount }) }),
  preferences: z.strictObject({ day_start: time, day_end: time, lunch_buffer_minutes: z.number().int().min(0).max(180), rest_buffer_minutes: z.number().int().min(0).max(180), return_to_base: z.boolean() }),
  stops: z.array(z.strictObject({ id: z.uuid(), catalog_place_id: z.uuid().optional(), provider_place_id: z.string().min(1).max(255).optional(), destination_slug: destination, user_title: z.string().trim().min(1).max(200), location, coordinate_provenance: z.enum(["editorial", "user_entered"]), requested_duration_min: z.number().int().min(15).max(720), is_required: z.boolean(), hours, lock: z.strictObject({ plan_date: z.iso.date(), start_local: time, sort_index: z.number().int().min(0).max(29) }).optional(), transport_constraint: z.enum(["land", "manual_transfer", "access_unverified"]), cost_estimate: cost })).max(30),
}).refine(value => draftIssues(value).length === 0);
