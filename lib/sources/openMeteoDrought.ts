// Open-Meteo Historical Weather API (ERA5 reanalysis) — free, no API key.
// https://open-meteo.com/en/docs/historical-weather-api
//
// Drought proxy: compares the most recent 30-day rainfall total against the
// same 30-day calendar window one year earlier, at each district centroid.
// This is a simple year-over-year anomaly, not a calibrated SPI/SPEI index —
// documented as illustrative in the README.
import { DISTRICTS } from "@/lib/districts";
import { clamp } from "@/lib/geo";
import type { SignalCandidate, SourceResult } from "./types";

interface ArchiveDaily {
  time: string[];
  precipitation_sum: (number | null)[];
}

interface ArchiveLocation {
  daily: ArchiveDaily;
}

function sum(values: (number | null)[]): number {
  return values.reduce((acc: number, v) => acc + (v ?? 0), 0);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function fetchDroughtSignals(): Promise<SourceResult> {
  const now = new Date();
  const recentStart = new Date(now.getTime() - 30 * 86400_000);
  const priorYearEnd = new Date(now.getTime() - 365 * 86400_000);
  const priorYearStart = new Date(priorYearEnd.getTime() - 30 * 86400_000);
  // ERA5 archive typically lags ~5 days behind real time.
  const archiveEnd = new Date(now.getTime() - 5 * 86400_000);

  const lat = DISTRICTS.map((d) => d.lat).join(",");
  const lon = DISTRICTS.map((d) => d.lon).join(",");
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    start_date: isoDate(priorYearStart),
    end_date: isoDate(archiveEnd),
    daily: "precipitation_sum",
    timezone: "auto",
  });

  try {
    const res = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`Open-Meteo archive responded ${res.status}`);
    const data = (await res.json()) as ArchiveLocation[] | ArchiveLocation;
    const locations = Array.isArray(data) ? data : [data];

    const signals: SignalCandidate[] = [];

    DISTRICTS.forEach((district, i) => {
      const loc = locations[i];
      if (!loc?.daily) return;

      const dates = loc.daily.time;
      const precip = loc.daily.precipitation_sum;

      const recentIdx = dates.findIndex((d) => d >= isoDate(recentStart));
      const priorEndIdx = dates.findIndex((d) => d >= isoDate(priorYearEnd));

      const recentSum = recentIdx >= 0 ? sum(precip.slice(recentIdx)) : 0;
      const priorSum =
        priorEndIdx >= 0 ? sum(precip.slice(0, priorEndIdx)) : recentSum;

      const deficitPct =
        priorSum > 5 ? ((priorSum - recentSum) / priorSum) * 100 : 0;

      const value = clamp((deficitPct - 10) * 2.2, 0, 100);

      signals.push({
        districtId: district.id,
        category: "DROUGHT",
        source: "OPEN_METEO",
        value,
        unit: "% rainfall deficit (YoY)",
        summary:
          deficitPct > 5
            ? `Rainfall ${deficitPct.toFixed(0)}% below the same period last year (${recentSum.toFixed(0)} mm vs ${priorSum.toFixed(0)} mm)`
            : `Rainfall tracking near or above last year's level (${recentSum.toFixed(0)} mm)`,
        metadata: { recentSum, priorSum, deficitPct },
        observedAt: new Date(),
      });
    });

    return {
      source: "OPEN_METEO_DROUGHT",
      signals,
      itemsFetched: locations.length,
      status: "success",
    };
  } catch (err) {
    return {
      source: "OPEN_METEO_DROUGHT",
      signals: [],
      itemsFetched: 0,
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
