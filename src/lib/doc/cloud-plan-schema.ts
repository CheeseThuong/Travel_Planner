import { z } from "zod";
import { codeSchema, savedPlanSchema } from "./saved-plan";
export const publishSchema = z.strictObject({ action: z.literal("publish"), plan: savedPlanSchema });
export const openSchema = z.strictObject({ action: z.literal("open"), code: codeSchema });
export const removeSchema = z.strictObject({ action: z.literal("remove"), code: codeSchema });
export const requestSchema = z.discriminatedUnion("action", [publishSchema, openSchema, removeSchema]);
