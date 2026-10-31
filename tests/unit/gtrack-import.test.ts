import { describe, expect, it } from "vitest";
import { inferGTrackCategory, parseGTrackJson } from "@/domain/import/gtrack-json";

const sample = {
  business_info: {name: "CLOUD HILL HOTEL",address: "04 Đ. Mạc Đĩnh Chi, Xuân Hương - Đà Lạt, Lâm Đồng 66000, Việt Nam",phone: "+84 818 869 696"},
  location: {coordinates: {latitude: 11.9404988,longitude: 108.4299966},place_id: "ChIJRXy8aAATcTERuQnlJF3_dTU",maps_url: "https://www.google.com/maps?cid=3852265831801358777"},
  ratings_reviews: {rating: 5, review_count: 6},categories: ["Khách sạn"],
  media: {image_url: "https://example.com/third-party.jpg"},technical: {cid: "3852265831801358777"}
};

describe("gTrack JSON import", () => {
  it("reads real coordinates, hotel category and reference without persisting rating or media", () => {
    const place = parseGTrackJson(JSON.stringify(sample));
    expect(place).toMatchObject({title: "CLOUD HILL HOTEL", location: {lat:11.9404988,lng:108.4299966},category:"lodging",cid:"3852265831801358777",placeId:"ChIJRXy8aAATcTERuQnlJF3_dTU"});
    expect(JSON.stringify(place)).not.toContain("third-party.jpg");
    expect(JSON.stringify(place)).not.toContain("review_count");
  });
  it("rejects invalid coordinates and invalid JSON", () => {
    expect(() => parseGTrackJson("not json")).toThrow();
    expect(() => parseGTrackJson(JSON.stringify({...sample,location:{coordinates:{latitude:91,longitude:108}}}))).toThrow();
    expect(() => parseGTrackJson(JSON.stringify({...sample,location:{coordinates:{latitude:"11.94",longitude:108}}}))).toThrow();
  });
  it("does not turn foreign map links into clickable URLs", () => {
    expect(parseGTrackJson(JSON.stringify({...sample, location:{...sample.location,maps_url:"javascript:alert(1)"}})).mapsUrl).toBeNull();
  });
  it("maps common Vietnamese categories", () => {
    expect(inferGTrackCategory(["Nhà hàng"])).toBe("food");
    expect(inferGTrackCategory(["Quán cà phê"])).toBe("cafe");
    expect(inferGTrackCategory(["Danh thắng"])).toBe("landmarks");
    expect(inferGTrackCategory(["Nonexistent category"])).toBeNull();
  });
});
