import { z } from "zod";
import { EditorialPlaceResolver } from "@/adapters/maps/editorial-place-resolver";
import { MapsUrlError } from "@/domain/import/maps-url";
import { editorialCatalogSummaries } from "@/adapters/discovery/editorial.server";
import { ApiError, readJson, success, withApi } from "@/lib/api/http.server";
import { createRequestLimiter } from "@/lib/api/request-limit.server";

const schema = z.strictObject({ url: z.string().min(1).max(2048), destination_slug: z.enum(["nha-trang", "da-lat"]) });
const resolver = new EditorialPlaceResolver(editorialCatalogSummaries);
const limit = createRequestLimiter(60, 60_000);

export function POST(request: Request): Promise<Response> {
  return withApi(request, async (id) => {
    limit();
    const input = await readJson(request, schema, 8192);
    try { return success(await resolver.resolve(input, request.signal), id); }
    catch (error) {
      if (error instanceof MapsUrlError) throw new ApiError(400, error.code, "Liên kết Maps chưa được hỗ trợ. Bạn có thể nhập địa điểm thủ công.");
      throw error;
    }
  });
}
