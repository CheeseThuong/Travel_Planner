import { describe, expect, it } from "vitest";
import { weatherAdvice, weatherRisk } from "@/domain/planning/doc-weather-advice";
const day={date:"2026-10-30",maxC:24,minC:17,precipitationMm:0,rainChance:0,code:1};
describe("DỌC weather advisory",()=>{
  it("stays deterministic",()=>expect(weatherRisk(day)).toBe("dry"));
  it("raises heavy rain over gentle conditions",()=>expect(weatherAdvice({...day,precipitationMm:21,rainChance:80}).shouldReviewOutdoorStops).toBe(true));
  it("does not modify a trip or infer an ETA",()=>{const original=Object.freeze({...day,precipitationMm:6,rainChance:70});weatherAdvice(original);expect(original.precipitationMm).toBe(6);});
});
