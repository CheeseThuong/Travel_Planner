import { z } from "zod";
import { weatherForecastSchema, type WeatherForecast } from "@/lib/validation/doc-weather";
import { readJson } from "@/lib/api/http.server";

const destinations = {
  "da-lat": { lat: 11.9404, lon: 108.4583, label: "Đà Lạt" },
  "nha-trang": { lat: 12.2388, lon: 109.1967, label: "Nha Trang" },
} as const;
const values = z.array(z.number()).length(7);
const providerSchema = z.object({
  current: z.object({ temperature_2m: z.number(), relative_humidity_2m: z.number(), weather_code: z.number(), time: z.string() }),
  daily: z.object({ time: z.array(z.string()).length(7), temperature_2m_max: values, temperature_2m_min: values,
    precipitation_sum: values, precipitation_probability_max: values, weather_code: values }),
});

export async function fetchWeather(city: WeatherForecast["city"], signal?: AbortSignal): Promise<WeatherForecast> {
  const place = destinations[city];
  const params = new URLSearchParams({ latitude: String(place.lat), longitude: String(place.lon),
    timezone: "Asia/Ho_Chi_Minh", forecast_days: "7", current: "temperature_2m,relative_humidity_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max" });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
    redirect: "error", next: { revalidate: 900 },
  });
  if (!response.ok || !response.body) throw new Error("Weather unavailable");
  // Reuse the bounded JSON reader; provider errors are mapped at the API boundary.
  const data = await readJson(response, providerSchema);
  return weatherForecastSchema.parse({ city, label: place.label,
    current: { temperatureC: data.current.temperature_2m, humidity: data.current.relative_humidity_2m,
      code: data.current.weather_code, observedLocal: data.current.time },
    days: data.daily.time.map((date, i) => ({ date, maxC: data.daily.temperature_2m_max[i], minC: data.daily.temperature_2m_min[i],
      precipitationMm: data.daily.precipitation_sum[i], rainChance: data.daily.precipitation_probability_max[i], code: data.daily.weather_code[i] })),
    updatedAt: new Date().toISOString(), attribution: "Open-Meteo.com · CC BY 4.0", forecast: true });
}
