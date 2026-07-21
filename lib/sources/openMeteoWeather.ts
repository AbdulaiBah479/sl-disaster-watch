// Open-Meteo Forecast API — free, no API key, non-commercial use.
// https://open-meteo.com/en/docs
// Single batched request for all district centroids using comma-separated
// lat/lon lists (Open-Meteo returns an array of results, one per location).
import { DISTRICTS } from "@/lib/districts";
import { clamp } from "@/lib/geo";
import type { SignalCandidate, SourceResult } from "./types";

interface OpenMeteoDaily {
  time: string[];
  precipitation_sum: (number | null)[];
  wind_speed_10m_max: (number | null)[];
  wind_gusts_10m_max: (number | null)[];
}

interface OpenMeteoLocation {
  daily: OpenMeteoDaily;
}

function sum(values: (number | null)[]): number {
  return values.reduce((acc: number, v) => acc + (v ?? 0), 0);
}

export async function fetchOpenMeteoWeatherSignals(): Promise<SourceResult> {
  const lat = DISTRICTS.map((d) => d.lat).join(",");
  const lon = DISTRICTS.map((d) => d.lon).join(",");
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    daily: "precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max",
    past_days: "14",
    forecast_days: "3",
    timezone: "auto",
  });

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

      const rain14d = sum(loc.daily.precipitation_sum);
      const rain72h = sum(loc.daily.precipitation_sum.slice(-5, -2)); // last 3 recorded past days
      const maxGust = Math.max(
        ...loc.daily.wind_gusts_10m_max.map((v) => v ?? 0),
      );

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
    });

    return {
      source: "OPEN_METEO_WEATHER",
      signals,
      itemsFetched: locations.length,
      status: "success",
    };
  } catch (err) {
    return {
      source: "OPEN_METEO_WEATHER",
      signals: [],
      itemsFetched: 0,
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
