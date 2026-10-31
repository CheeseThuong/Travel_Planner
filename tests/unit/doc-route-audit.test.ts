import {describe,it,expect} from "vitest";
import {auditRouteAccounting} from "../../src/domain/planning/doc-route-audit";
describe("DỌC itinerary accounting",()=>{
  it("accounts for all selected stops",()=>{expect(auditRouteAccounting(["a","b","c"],["b","a"],["c"]).ok).toBe(true);});
  it("rejects silent loss",()=>{const a=auditRouteAccounting(["a","b"],["a"],[]); expect(a.ok).toBe(false); expect(a.missing).toEqual(["b"]);});
  it("rejects duplicates and contradictory inclusion",()=>{const a=auditRouteAccounting(["a","b"],["a","a"],["a","b"]);expect(a.ok).toBe(false);expect(a.overlap).toEqual(["a"]);expect(a.duplicateScheduled).toEqual(["a"]);});
  it("rejects unknown stops",()=>{expect(auditRouteAccounting(["a"],["a","z"],[]).unknown).toEqual(["z"]);});
});
