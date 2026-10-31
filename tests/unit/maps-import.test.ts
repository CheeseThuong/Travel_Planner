import { expect, test, vi } from "vitest";
import { parseMapsUrl, validateMapsRedirect } from "@/domain/import/maps-url";
import { EditorialPlaceResolver } from "@/adapters/maps/editorial-place-resolver";

test.each([
  "http://www.google.com/maps?q=chợ", "https://localhost/maps", "https://127.0.0.1/maps",
  "https://169.254.169.254/maps", "https://[::1]/maps", "https://google.com.evil.test/maps",
  "https://evil.test@www.google.com/maps", "https://www.google.com:444/maps", "https://www.google.com/url?q=https://localhost",
  "https://goo.gl/not-maps/abc", "https://www.google.com\\@evil.test/maps", "https://www.google.com/maps?query=%0aevil",
  "javascript:alert(1)", "not a url", "https://www.google.com/maps?q=" + "a".repeat(2048),
])("rejects unsafe/unsupported URL before I/O: %s", (url) => {
  expect(() => parseMapsUrl(url)).toThrow("UNSUPPORTED_URL");
});

test("extracts only search hints; shortlinks remain opaque; each redirect is allowlisted", () => {
  expect(parseMapsUrl("https://www.google.com/maps/search/?api=1&query=Ch%E1%BB%A3+%C4%90%C3%A0+L%E1%BA%A1t").query).toBe("Chợ Đà Lạt");
  expect(parseMapsUrl("https://www.google.com/maps/place/Ch%E1%BB%A3+%C4%90%C3%A0+L%E1%BA%A1t/@1,2,3z").query).toBe("Chợ Đà Lạt");
  expect(parseMapsUrl("https://maps.app.goo.gl/abc123").kind).toBe("short");
  expect(parseMapsUrl("https://goo.gl/maps/abc123").kind).toBe("short");
  expect(validateMapsRedirect("https://maps.app.goo.gl/abc", "https://www.google.com/maps?q=market").query).toBe("market");
  for (const location of ["https://localhost/maps", "http://www.google.com/maps", "//127.0.0.1/maps", "https://www.google.com/url?q=https://localhost"]) {
    expect(() => validateMapsRedirect("https://maps.app.goo.gl/abc", location)).toThrow("UNSAFE_REDIRECT");
  }
});

test("search-path and exact Maps-host root forms are search hints, never verified coordinates", () => {
  expect(parseMapsUrl("https://www.google.com/maps/search/Cho+Da+Lat/@1,2,3z")).toEqual({ kind: "full", query: "Cho Da Lat" });
  expect(parseMapsUrl("https://maps.google.com/?q=Cho+Da+Lat")).toEqual({ kind: "full", query: "Cho Da Lat" });
  expect(parseMapsUrl("https://www.google.com/maps/search/@11.94,108.45,15z")).toEqual({ kind: "full" });
  expect(parseMapsUrl("https://www.google.com/maps/search/?api=1&query_place_id=ChIJ_fixture")).toEqual({ kind: "full", provider_place_id: "ChIJ_fixture" });
  expect(() => parseMapsUrl("https://www.google.com/?q=Cho+Da+Lat")).toThrow("UNSUPPORTED_URL");
});

const place = { id: "editorial-one", slug: "one", title: "Chợ Đà Lạt", description: "Chợ trung tâm", category: "market", durationMinutes: 60, lat: 11.94, lng: 108.44, sourceUrl: "https://www.openstreetmap.org/" };
test("resolver returns independent candidates only, isolates destinations and never fetches", async () => {
  const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("No network allowed"));
  try {
    const resolver = new EditorialPlaceResolver({ "da-lat": [place, { ...place, id: "two", title: "Chợ đêm Đà Lạt" }], "nha-trang": [] });
    const result = await resolver.resolve({ url: "https://www.google.com/maps?q=Chợ", destination_slug: "da-lat" });
    expect(result.status).toBe("candidate_selection_required");
    expect(result.candidates.map((candidate) => candidate.editorial_place_id)).toEqual(["editorial-one", "two"]);
    expect(result.candidates.every((candidate) => candidate.provider === "editorial")).toBe(true);
    expect((await resolver.resolve({ url: "https://www.google.com/maps?q=Chợ", destination_slug: "nha-trang" })).status).toBe("manual_entry_required");
    for (const url of ["https://maps.app.goo.gl/abc", "https://www.google.com/maps?query_place_id=opaque", "https://www.google.com/maps/@11,108,14z"]) {
      expect((await resolver.resolve({ url, destination_slug: "da-lat" })).status).toBe("manual_entry_required");
    }
    expect(network).not.toHaveBeenCalled();
  } finally { network.mockRestore(); }
});
