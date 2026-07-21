// Open-Meteo Flood API — GloFAS v4 river discharge reanalysis/forecast.
// Free, no API key. https://open-meteo.com/en/docs/flood-api
//
// This is the single biggest accuracy lever for FLOOD_RIVER: rainfall is a
// leading indicator, but discharge is the actual state of the river. We
// compare today's forecast discharge against the ensemble median for the
// same day to get a real anomaly ratio, rather than inferring flood risk
// from rainfall alone.
import { clamp } from "@/lib/geo";
import type { SignalCandidate, SourceResult } from "./types";

interface FloodDaily {
  time: string[];
  river_discharge: (number | null)[];
  river_discharge_median: (number | null)[];
}

interface FloodLocation {
  daily: FloodDaily;
}

export interface FloodQueryPoint {
  id: string;
  lat: number;
  lon: number;
}

export async function fetchFloodDischargeSignals(
  points: FloodQueryPoint[],
): Promise<{ result: SourceResult; byPointId: Map<string, SignalCandidate> }> {
  const lat = points.map((p) => p.lat).join(",");
  const lon = points.map((p) => p.lon).join(",");
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    daily: "river_discharge,river_discharge_median",
    forecast_days: "3",
  });

  const byPointId = new Map<string, SignalCandidate>();

  try {
    const res = await fetch(
      `https://flood-api.open-meteo.com/v1/flood?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`Open-Meteo flood API responded ${res.status}`);
    const data = (await res.json()) as FloodLocation[] | FloodLocation;
    const locations = Array.isArray(data) ? data : [data];

    points.forEach((p, i) => {
      const daily = locations[i]?.daily;
      const discharge = daily?.river_discharge?.[0];
      const median = daily?.river_discharge_median?.[0];

      if (discharge == null || median == null || median <= 0) {
        // GloFAS has no modeled reach at this exact point (common on the
        // coast or off small streams) — not an error, just no signal here.
        return;
      }

      const ratio = discharge / median;
      const value = clamp((ratio - 1) * 80, 0, 100);

      byPointId.set(p.id, {
        districtId: p.id,
        category: "FLOOD_RIVER",
        source: "OPEN_METEO_FLOOD",
        value,
        unit: "discharge / median ratio",
        summary: `River discharge ${discharge.toFixed(1)} m³/s vs. seasonal median ${median.toFixed(1)} m³/s (×${ratio.toFixed(2)})`,
        metadata: { discharge, median, ratio },
        observedAt: new Date(),
      });
    });

    return {
      result: {
        source: "OPEN_METEO_FLOOD",
        signals: [...byPointId.values()],
        itemsFetched: locations.length,
        status: "success",
      },
      byPointId,
    };
  } catch (err) {
    return {
      result: {
        source: "OPEN_METEO_FLOOD",
        signals: [],
        itemsFetched: 0,
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      },
      byPointId,
    };
  }
}
