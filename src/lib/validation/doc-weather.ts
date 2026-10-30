import { z } from "zod";

const temperature = z.number().min(-100).max(70);
const code = z.number().int().min(0).max(99);
export const weatherDaySchema = z.object({
  date: z.iso.date(), maxC: temperature, minC: temperature,
  precipitationMm: z.number().min(0).max(3000), rainChance: z.number().min(0).max(100), code,
}).refine(day => day.minC <= day.maxC);
export const weatherForecastSchema = z.object({
  city: z.enum(["da-lat", "nha-trang"]), label: z.string().min(1).max(80),
  current: z.object({ temperatureC: temperature, humidity: z.number().min(0).max(100), code,
    observedLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/) }),
  days: z.array(weatherDaySchema).length(7), updatedAt: z.iso.datetime(),
  attribution: z.literal("Open-Meteo.com · CC BY 4.0"), forecast: z.literal(true),
});
export type WeatherForecast = z.infer<typeof weatherForecastSchema>;
