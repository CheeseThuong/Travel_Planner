import { z } from "zod";
import { placeCategories, type PlaceCategory } from "@/domain/discovery/place";
import type { ContributionInput } from "@/domain/discovery/contribution";

const text = (max: number) => z.string().trim().min(1).max(max).refine(value => !/[\u0000-\u001f\u007f]/.test(value));
export const contributionSchema: z.ZodType<ContributionInput> = z.strictObject({
  destination_slug: z.enum(["nha-trang", "da-lat"]),
  title: text(160), description: text(1000), address: text(300).nullable(),
  location: z.strictObject({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
  categories: z.array(z.enum(Object.keys(placeCategories) as [PlaceCategory, ...PlaceCategory[]])).min(1).max(5).refine(values => new Set(values).size === values.length),
  tags: z.array(text(32)).max(10).refine(values => new Set(values).size === values.length),
  suggested_duration_min: z.number().int().min(15).max(720),
  transport_constraint: z.enum(["access_unverified", "manual_transfer"]),
  source: z.literal("original_user_contribution"), rights_confirmed: z.literal(true),
});
