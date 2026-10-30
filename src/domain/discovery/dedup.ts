import { haversineKm } from "../routing/matrix";
import { normalizePlaceText, type DiscoveryPlace } from "./place";

export interface DuplicateMatch { readonly retained_id: string; readonly duplicate_id: string; readonly certainty: "certain" | "suspected"; readonly reasons: readonly string[] }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
const facts = (place: DiscoveryPlace) => canonical(Object.fromEntries(Object.entries(place).filter(([key]) => key !== "id")));
function compare(a: DiscoveryPlace, b: DiscoveryPlace, sameFacts: boolean): Omit<DuplicateMatch, "retained_id" | "duplicate_id"> | null {
  const sharedIdentity = a.sources.some(left => left.provider_id !== null && b.sources.some(right => right.provider === left.provider && right.provider_id === left.provider_id));
  if (a.destination_slug !== b.destination_slug) return sharedIdentity ? { certainty: "suspected", reasons: ["DESTINATION_CONFLICT"] } : null;
  if (sharedIdentity) return sameFacts ? { certainty: "certain", reasons: ["PROVIDER_IDENTITY", "EXACT_FACTS"] } : { certainty: "suspected", reasons: ["PROVIDER_IDENTITY", "IDENTITY_FACTS_OR_RIGHTS_CONFLICT"] };
  const compatible = !a.categories.length || !b.categories.length || a.categories.some(category => b.categories.includes(category));
  if (!compatible || haversineKm(a.location, b.location) > 0.15) return null;
  const nameA = normalizePlaceText(a.title_vi), nameB = normalizePlaceText(b.title_vi);
  const addressA = normalizePlaceText(a.address ?? ""), addressB = normalizePlaceText(b.address ?? "");
  const tokensA = new Set(nameA.split(" ").filter(Boolean)), tokensB = new Set(nameB.split(" ").filter(Boolean));
  const overlap = [...tokensA].filter(token => tokensB.has(token)).length / Math.max(1, new Set([...tokensA, ...tokensB]).size);
  if (nameA && (nameA === nameB || (addressA && addressA === addressB && overlap >= 0.7))) return { certainty: "suspected", reasons: ["NAME_AND_PROXIMITY", ...(addressA && addressA === addressB ? ["ADDRESS_MATCH"] : []), ...(addressA && addressB && addressA !== addressB ? ["ADDRESS_CONFLICT"] : [])] };
  return null;
}

/** Only identical same-source facts collapse; every uncertain record retains its own provenance. */
export function deduplicateDiscovery(input: readonly DiscoveryPlace[]) {
  if (input.length > 130) throw new RangeError("Discovery candidate limit exceeded");
  const places: DiscoveryPlace[] = [], fingerprints: string[] = [], matches: DuplicateMatch[] = [], ids = new Set<string>();
  const confirmationIds = new Set<string>();
  let removed = 0, truncated = false;
  for (const original of input) {
    let candidate = original, suffix = 1;
    while (ids.has(candidate.id)) candidate = { ...original, id: `${original.id.slice(0, 140)}:variant:${suffix++}` };
    ids.add(candidate.id);
    const fingerprint = facts(candidate);
    let redundant = false;
    for (const [index, retained] of places.entries()) {
      const match = compare(retained, candidate, fingerprint === fingerprints[index]);
      if (!match) continue;
      if (match.certainty === "suspected") { confirmationIds.add(retained.id); confirmationIds.add(candidate.id); }
      if (matches.length < 200) matches.push({ retained_id: retained.id, duplicate_id: candidate.id, ...match }); else truncated = true;
      if (match.certainty === "certain") { redundant = true; removed++; break; }
    }
    if (!redundant) { places.push(candidate); fingerprints.push(fingerprint); }
  }
  return { places, matches, removed, truncated, confirmation_ids: [...confirmationIds].sort() };
}
