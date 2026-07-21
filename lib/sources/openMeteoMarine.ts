// Open-Meteo Marine Weather API — free, no API key. West Africa is covered
// by the global wave model. https://open-meteo.com/en/docs/marine-weather-api
import { DISTRICTS } from "@/lib/districts";
import { clamp } from "@/lib/geo";
import type { SignalCandidate, SourceResult } from "./types";

interface MarineDaily {
  time: string[];
  wave_height_max: (number | null)[];
}

interface MarineLocation {
  daily: MarineDaily;
}

export async function fetchMarineSignals(): Promise<SourceResult> {
  const coastal = DISTRICTS.filter((d) => d.coastal);
  const lat = coastal.map((d) => d.lat).join(",");
  const lon = coastal.map((d) => d.lon).join(",");
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    daily: "wave_height_max",
    forecast_days: "3",
    timezone: "auto",
  });

  try {
    const res = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`Open-Meteo marine responded ${res.status}`);
    const data = (await res.json()) as MarineLocation[] | MarineLocation;
    const locations = Array.isArray(data) ? data : [data];

    const signals: SignalCandidate[] = [];

    coastal.forEach((district, i) => {
      const loc = locations[i];
      const waveValues = loc?.daily?.wave_height_max;
      if (!waveValues || waveValues.length === 0) return;
      const maxWave = Math.max(...waveValues.map((v) => v ?? 0));

      const marineValue = clamp((maxWave - 1.2) * 55, 0, 100);
      signals.push({
        districtId: district.id,
        category: "MARINE_HAZARD",
        source: "OPEN_METEO",
        value: marineValue,
        unit: "m max wave height",
        summary: `Forecast max wave height ${maxWave.toFixed(1)} m`,
        metadata: { maxWave },
        observedAt: new Date(),
      });

      const coastalFloodValue = clamp((maxWave - 1.8) * 50, 0, 100);
      signals.push({
        districtId: district.id,
        category: "FLOOD_COASTAL",
        source: "OPEN_METEO",
        value: coastalFloodValue,
        unit: "m max wave height",
        summary: `Coastal surge risk from wave heights up to ${maxWave.toFixed(1)} m`,
        metadata: { maxWave },
        observedAt: new Date(),
      });
    });

    return {
      source: "OPEN_METEO_MARINE",
      signals,
      itemsFetched: locations.length,
      status: "success",
    };
  } catch (err) {
    return {
      source: "OPEN_METEO_MARINE",
      signals: [],
      itemsFetched: 0,
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
