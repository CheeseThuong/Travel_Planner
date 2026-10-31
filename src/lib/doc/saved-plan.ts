import { z } from "zod";
import { tripDraftSchema } from "@/lib/validation/trip-draft";
import type { TripDraft } from "@/domain/model/trip";

const visit = z.strictObject({
  id: z.string().uuid(), start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string(), travel: z.number().min(0).max(1440).nullable(),
});
const day = z.strictObject({ date: z.iso.date(), stops: z.array(visit).max(30), returnTime: z.string().optional() });
export const codeSchema = z.string().regex(/^DOC-[A-Za-z0-9_-]{32}$/);
export const savedPlanSchema = z.strictObject({
  schemaVersion: z.literal(1), code: codeSchema, createdAt: z.iso.datetime({ offset: true }),
  draft: tripDraftSchema, days: z.array(day).min(1).max(7),
  warnings: z.array(z.string().max(300)).max(60),
  status: z.literal("confirmed_preview"),
});
export type SavedPlan = z.infer<typeof savedPlanSchema>;
export type SavedDay = z.infer<typeof day>;
export type SavedDraft = TripDraft;
export function newPlanCode(bytes: Uint8Array): string {
  if (bytes.length !== 24) throw new Error("Mã kế hoạch cần đủ 192 bit ngẫu nhiên.");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let bits = 0, value = 0, result = "";
  for (const byte of bytes) { value = (value << 8) | byte; bits += 8;
    while (bits >= 6) { bits -= 6; result += alphabet[(value >>> bits) & 63]; }
    value &= (1 << bits) - 1;
  }
  return `DOC-${result}`;
}
export function generatePlanCode(): string {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) throw new Error("Trình duyệt thiếu bộ tạo số ngẫu nhiên bảo mật.");
  return newPlanCode(crypto.getRandomValues(new Uint8Array(24)));
}
export function validatedSavedPlan(value: unknown): SavedPlan {
  const parsed = savedPlanSchema.safeParse(value);
  if (!parsed.success) throw new Error("Tệp kế hoạch không hợp lệ hoặc không thuộc phiên bản được hỗ trợ.");
  const plan = parsed.data;
  const known = new Set(plan.draft.stops.map(stop => stop.id));
  const ids = plan.days.flatMap(d => d.stops.map(stop => stop.id));
  if (ids.some(id => !known.has(id)) || new Set(ids).size !== ids.length) throw new Error("Lịch trình chứa điểm trùng hoặc không tồn tại trong bản nháp.");
  return plan;
}
