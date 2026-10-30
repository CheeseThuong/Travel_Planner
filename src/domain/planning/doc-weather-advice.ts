/** Independent, deterministic advisory only. Never changes user locks or scheduling. */
export type WeatherDay = Readonly<{ date: string; maxC: number; minC: number; precipitationMm: number; rainChance: number; code: number }>;
export type WeatherRisk = "dry" | "showers" | "heavy_rain" | "hot" | "cool";
export function weatherRisk(day: WeatherDay): WeatherRisk {
  if (day.precipitationMm >= 15 || (day.precipitationMm >= 8 && day.rainChance >= 70)) return "heavy_rain";
  if (day.rainChance >= 55 || day.precipitationMm >= 4) return "showers";
  if (day.maxC >= 34) return "hot";
  if (day.minC <= 12) return "cool";
  return "dry";
}
export function weatherAdvice(day: WeatherDay) {
  const risk = weatherRisk(day);
  const notes: Record<WeatherRisk, string> = {
    dry: "Thời tiết dự báo tương đối thuận lợi; vẫn cần kiểm tra lại trước khi đi.",
    showers: "Có khả năng mưa. Dự phòng quán cà phê, bảo tàng hoặc lịch tham quan trong nhà.",
    heavy_rain: "Rủi ro mưa lớn. Cân nhắc đổi điểm ngoài trời, tránh trekking hoặc đường đèo nguy hiểm.",
    hot: "Nắng nóng. Ưu tiên điểm ngoài trời vào sáng sớm, dành giờ trưa để nghỉ.",
    cool: "Trời lạnh. Chuẩn bị áo ấm nếu đi săn mây hoặc đón bình minh.",
  };
  return { risk, message: notes[risk], shouldReviewOutdoorStops: risk === "showers" || risk === "heavy_rain" };
}
