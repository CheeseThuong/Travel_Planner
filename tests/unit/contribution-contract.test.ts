import { writeFileSync } from "node:fs";
import { expect, test } from "vitest";
import { z } from "zod";
import { contributionSchema } from "@/lib/validation/contribution";
import { contributionTransitionSchema } from "@/lib/api/contributions.server";
import { communityRowSchema } from "@/adapters/supabase/contributions.server";
import spec from "../../docs/openapi.json";

test("maintained contribution input and public output contracts equal runtime schemas", () => {
  const schemas = { ContributionPayload: z.toJSONSchema(contributionSchema, { io: "input" }), ContributionTransition: z.toJSONSchema(contributionTransitionSchema, { io: "input" }), CommunityPlace: z.toJSONSchema(communityRowSchema) };
  writeFileSync("docs/reports/evidence/SI03-02-openapi-schemas.json", JSON.stringify(schemas, null, 2) + "\n");
  for (const [name, schema] of Object.entries(schemas)) expect((spec.components.schemas as Record<string, unknown>)[name], name).toEqual(schema);
});
