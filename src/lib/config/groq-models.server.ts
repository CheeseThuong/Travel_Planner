/** Reviewed production/strict-output subset, ADR0035. No default model selection. */
export const reviewedGroqModels = ["openai/gpt-oss-20b", "openai/gpt-oss-120b"] as const;
export type ReviewedGroqModel = typeof reviewedGroqModels[number];
