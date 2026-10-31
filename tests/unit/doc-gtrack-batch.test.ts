import {describe,it,expect} from "vitest";
import {parseGTrackBatch} from "../../src/domain/import/doc-gtrack-batch";
const place={business_info:{name:"CLOUD HILL HOTEL",address:"Đà Lạt"},location:{coordinates:{latitude:11.9404988,longitude:108.4299966},place_id:"ChIJRXy8aAATcTERuQnlJF3_dTU"},categories:["Khách sạn"]};
describe("DỌC gTrack batch parser",()=>{
 it("parses and deduplicates by provider identity",()=>{const v=parseGTrackBatch(JSON.stringify([place,place])); expect(v.items).toHaveLength(1);expect(v.duplicateCount).toBe(1);expect(v.items[0].place.category).toBe("lodging");});
 it("does not hide invalid entries",()=>{const v=parseGTrackBatch(JSON.stringify([place,{business_info:{}}]));expect(v.items).toHaveLength(1);expect(v.invalid).toHaveLength(1);});
 it("limits batch size",()=>expect(()=>parseGTrackBatch(JSON.stringify(Array(101).fill(place)))).toThrow(/100/));
});
