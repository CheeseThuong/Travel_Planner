import { z } from "zod";
import { placeCategories, type PlaceCategory } from "@/domain/discovery/place";
import type { DiscoveryPreferences } from "@/domain/discovery/recommendations";

export const discoveryPreferencesSchema: z.ZodType<DiscoveryPreferences> = z.strictObject({
  interests: z.array(z.enum(Object.keys(placeCategories) as [PlaceCategory, ...PlaceCategory[]])).max(10).default([]),
  required_place_ids: z.array(z.uuid()).max(30).default([]), excluded_place_ids: z.array(z.uuid()).max(130).default([]),
  zone: z.enum(["all", "center", "nearby", "outskirts", "remote", "special_transport"]).default("all"),
  max_distance_km: z.number().min(0).max(150).optional(), max_suggestions: z.number().int().min(0).max(30).optional(), auto_suggest: z.boolean().default(true),
  food_preference: z.enum(["any", "vegetarian", "vegan", "seafood", "local_food"]).default("any"),
  accommodation_preference: z.enum(["any", "hotel", "resort", "homestay", "hostel", "villa"]).default("any"),
  time_of_day: z.enum(["any", "morning", "afternoon", "evening"]).default("any"),
});
