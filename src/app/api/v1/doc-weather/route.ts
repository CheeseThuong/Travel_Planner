import { z } from "zod";
import { fetchWeather } from "@/adapters/weather/open-meteo.server";
import { ApiError, success, withApi } from "@/lib/api/http.server";
import { createRequestLimiter } from "@/lib/api/request-limit.server";
import { parseServerEnv } from "@/lib/config/env.server";

const citySchema = z.enum(["da-lat", "nha-trang"]);
const minuteLimit = createRequestLimiter(60, 60_000);
const dayLimit = createRequestLimiter(1000, 86_400_000);
export async function GET(request: Request) {
  return withApi(request, async id => {
    const params = new URL(request.url).searchParams;
    const city = citySchema.safeParse(params.get("city") ?? "da-lat");
    if (!city.success || params.getAll("city").length > 1 || [...params.keys()].some(key => key !== "city")) {
      throw new ApiError(400, "VALIDATION_ERROR", "Điểm đến không được hỗ trợ.");
    }
    if (!parseServerEnv().DOC_WEATHER_ENABLED) throw new ApiError(503, "PROVIDER_UNAVAILABLE", "Dự báo trực tuyến chưa bật.");
    minuteLimit(); dayLimit();
    try { return success(await fetchWeather(city.data, request.signal), id); }
    catch { throw new ApiError(503, "PROVIDER_UNAVAILABLE", "Chưa lấy được dự báo thời tiết. Lịch trình của bạn được giữ nguyên."); }
  });
}
