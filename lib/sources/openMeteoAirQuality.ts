// Open-Meteo Air Quality API (CAMS) — free, no API key.
// https://open-meteo.com/en/docs/air-quality-api
// Tracks PM10 (dominant during Nov-Mar Harmattan Saharan dust events, which
// affect respiratory health and Lungi/Freetown aviation visibility).
import { DISTRICTS } from "@/lib/districts";
import { clamp } from "@/lib/geo";
import type { SignalCandidate, SourceResult } from "./types";

interface AirQualityHourly {
  time: string[];
  pm10: (number | null)[];
  pm2_5: (number | null)[];
}

interface AirQualityLocation {
  hourly: AirQualityHourly;
}

export async function fetchAirQualitySignals(): Promise<SourceResult> {
  const lat = DISTRICTS.map((d) => d.lat).join(",");
  const lon = DISTRICTS.map((d) => d.lon).join(",");
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: "pm10,pm2_5",
    forecast_days: "1",
    timezone: "auto",
  });

  try {
    const res = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`Open-Meteo air quality responded ${res.status}`);
    const data = (await res.json()) as AirQualityLocation[] | AirQualityLocation;
    const locations = Array.isArray(data) ? data : [data];

    const signals: SignalCandidate[] = [];

    DISTRICTS.forEach((district, i) => {
      const loc = locations[i];
      const pm10Values = loc?.hourly?.pm10?.filter((v): v is number => v != null);
      if (!pm10Values || pm10Values.length === 0) return;
      const avgPm10 =
        pm10Values.reduce((a, b) => a + b, 0) / pm10Values.length;

      const value = clamp((avgPm10 - 50) / 2, 0, 100);
      signals.push({
        districtId: district.id,
        category: "AIR_QUALITY",
        source: "OPEN_METEO",
        value,
        unit: "µg/m³ PM10 (avg next 24h)",
        summary: `Average forecast PM10 ${avgPm10.toFixed(0)} µg/m³`,
        metadata: { avgPm10 },
        observedAt: new Date(),
      });
    });

    return {
      source: "OPEN_METEO_AIR_QUALITY",
      signals,
      itemsFetched: locations.length,
      status: "success",
    };
  } catch (err) {
    return {
      source: "OPEN_METEO_AIR_QUALITY",
      signals: [],
      itemsFetched: 0,
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
