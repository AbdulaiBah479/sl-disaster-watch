// Open-Meteo Forecast API — free, no API key, non-commercial use.
// https://open-meteo.com/en/docs
// Single batched request for all district centroids using comma-separated
// lat/lon lists (Open-Meteo returns an array of results, one per location).
import { DISTRICTS } from "@/lib/districts";
import { clamp } from "@/lib/geo";
import type { SignalCandidate, SourceResult } from "./types";

const PAST_DAYS = 14;
// forecast_days counts today as day 0, so 8 gives us today + the next 7
// days — exactly what the +1/+3/+7 day prediction horizons need.
const FORECAST_DAYS = 8;

interface OpenMeteoDaily {
  time: string[];
  precipitation_sum: (number | null)[];
  wind_speed_10m_max: (number | null)[];
  wind_gusts_10m_max: (number | null)[];
}

interface OpenMeteoLocation {
  daily: OpenMeteoDaily;
}

// One forward-looking day of rainfall/wind, keyed by district — this is
// the real forecast data the live signals above only use day 0 of; the
// prediction engine (lib/predictionEngine.ts) uses the remaining days.
export interface WeatherForecastDay {
  dayOffset: number; // 0 = today, 1..7 = days ahead
  precipitationMm: number;
  windGustKmh: number;
}

export interface WeatherSourceOutput {
  result: SourceResult;
  weatherForecastByDistrict: Map<string, WeatherForecastDay[]>;
}

function sum(values: (number | null)[]): number {
  return values.reduce((acc: number, v) => acc + (v ?? 0), 0);
}

export async function fetchOpenMeteoWeatherSignals(): Promise<WeatherSourceOutput> {
  const lat = DISTRICTS.map((d) => d.lat).join(",");
  const lon = DISTRICTS.map((d) => d.lon).join(",");
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    daily: "precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max",
    past_days: String(PAST_DAYS),
    forecast_days: String(FORECAST_DAYS),
    timezone: "auto",
  });

  const weatherForecastByDistrict = new Map<string, WeatherForecastDay[]>();

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`Open-Meteo forecast responded ${res.status}`);
    const data = (await res.json()) as OpenMeteoLocation[] | OpenMeteoLocation;
    const locations = Array.isArray(data) ? data : [data];

    const signals: SignalCandidate[] = [];

    DISTRICTS.forEach((district, i) => {
      const loc = locations[i];
      if (!loc?.daily) return;
      const daily = loc.daily;
      // The response is chronological: PAST_DAYS entries, then FORECAST_DAYS
      // entries starting with today — so today's index is always
      // (length - FORECAST_DAYS), regardless of minor API off-by-ones.
      const todayIdx = Math.max(0, daily.time.length - FORECAST_DAYS);

      const rain14d = sum(daily.precipitation_sum.slice(0, todayIdx));
      const rain72h = sum(daily.precipitation_sum.slice(Math.max(0, todayIdx - 2), todayIdx + 1));
      const maxGust = Math.max(0, ...daily.wind_gusts_10m_max.slice(todayIdx).map((v) => v ?? 0));

      // River / flash flood: heavy 14-day accumulation, weighted toward riverine districts.
      const floodValue = clamp(
        (rain14d - 150) / 3 + (district.riverine ? 10 : 0),
        0,
        100,
      );
      signals.push({
        districtId: district.id,
        category: "FLOOD_RIVER",
        source: "OPEN_METEO",
        value: floodValue,
        unit: "mm/14d composite",
        summary: `${rain14d.toFixed(0)} mm rainfall over the past 14 days`,
        metadata: { rain14d, rain72h },
        observedAt: new Date(),
      });

      // Landslide: short, intense rainfall on susceptible slopes.
      const slopeFactor =
        district.landslideRisk === "high"
          ? 1.6
          : district.landslideRisk === "medium"
            ? 1.1
            : 0.5;
      const landslideValue = clamp((rain72h - 40) * slopeFactor, 0, 100);
      signals.push({
        districtId: district.id,
        category: "LANDSLIDE",
        source: "OPEN_METEO",
        value: landslideValue,
        unit: "mm/72h composite",
        summary: `${rain72h.toFixed(0)} mm rainfall over the past 72 hours (slope susceptibility: ${district.landslideRisk})`,
        metadata: { rain72h, landslideRisk: district.landslideRisk },
        observedAt: new Date(),
      });

      // Severe storm / wind.
      const windValue = clamp((maxGust - 40) * 2, 0, 100);
      signals.push({
        districtId: district.id,
        category: "STORM_WIND",
        source: "OPEN_METEO",
        value: windValue,
        unit: "km/h max gust",
        summary: `Peak forecast wind gust ${maxGust.toFixed(0)} km/h`,
        metadata: { maxGust },
        observedAt: new Date(),
      });

      const forecastDays: WeatherForecastDay[] = [];
      for (let offset = 0; offset < FORECAST_DAYS; offset++) {
        const idx = todayIdx + offset;
        if (idx >= daily.time.length) break;
        forecastDays.push({
          dayOffset: offset,
          precipitationMm: daily.precipitation_sum[idx] ?? 0,
          windGustKmh: daily.wind_gusts_10m_max[idx] ?? 0,
        });
      }
      weatherForecastByDistrict.set(district.id, forecastDays);
    });

    return {
      result: {
        source: "OPEN_METEO_WEATHER",
        signals,
        itemsFetched: locations.length,
        status: "success",
      },
      weatherForecastByDistrict,
    };
  } catch (err) {
    return {
      result: {
        source: "OPEN_METEO_WEATHER",
        signals: [],
        itemsFetched: 0,
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      },
      weatherForecastByDistrict,
    };
  }
}
