import { describe, expect, test } from "vitest";
import { contributionSchema } from "@/lib/validation/contribution";

const input = { destination_slug: "da-lat", title: "Điểm người dùng", description: "Nội dung tự viết có quyền chia sẻ", address: null, location: { lat: 11.94, lng: 108.45 }, categories: ["nature"], tags: [], suggested_duration_min: 60, transport_constraint: "access_unverified", source: "original_user_contribution", rights_confirmed: true };
describe("original community contributions", () => {
  test("accepts original pin/text, canonical lodging and explicit rights without inventing facts", () => {
    expect(contributionSchema.parse(input)).toEqual(input);
    expect(contributionSchema.parse({ ...input, title: "\nsecret" }).title).toBe("secret");
    expect(contributionSchema.parse({ ...input, categories: ["lodging"] }).categories).toEqual(["lodging"]);
  });
  test.each([
    { owner_id: "forged" }, { status: "approved" }, { rights_confirmed: false }, { source: "google" }, { source_url: "https://maps.app.goo.gl/opaque" },
    { hours: { state: "verified_editorial" } }, { price: 100 }, { location: { lat: 91, lng: 0 } }, { location: { lat: NaN, lng: 0 } },
    { categories: ["nature", "nature"] }, { categories: [] }, { tags: ["a", "a"] }, { title: "x\ny" },
    { destination_slug: "constructor" }, { suggested_duration_min: 14 }, { suggested_duration_min: 30.5 },
  ])("rejects unauthorized metadata, rights, malformed bounds and duplicate labels: %j", change => {
    expect(contributionSchema.safeParse({ ...input, ...change }).success).toBe(false);
  });
});
