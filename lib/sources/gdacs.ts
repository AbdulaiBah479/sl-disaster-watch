// GDACS (Global Disaster Alert and Coordination System) — free public API.
// https://www.gdacs.org/gdacsapi/swagger/index.html
// Source acknowledgement required by GDACS terms of use: "Global Disaster
// Alert and Coordination System, GDACS".
import { DISTRICTS } from "@/lib/districts";
import { clamp, distanceKm } from "@/lib/geo";
import type { HazardCategory } from "@/lib/hazards";
import type { SignalCandidate, SourceResult } from "./types";

interface GdacsFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    eventtype: string;
    name: string;
    alertlevel: "Green" | "Orange" | "Red";
    iscurrent: string;
    fromdate: string;
    todate: string;
    country: string;
    source: string;
    url: { report: string };
  };
}

interface GdacsResponse {
  features: GdacsFeature[];
}

const EVENT_TYPE_MAP: Record<string, HazardCategory | undefined> = {
  EQ: "EARTHQUAKE",
  TC: "STORM_WIND",
  FL: "FLOOD_RIVER",
  DR: "DROUGHT",
  WF: "WILDFIRE",
};

const ALERT_BASE_VALUE: Record<string, number> = {
  Green: 20,
  Orange: 55,
  Red: 88,
};

export async function fetchGdacsSignals(): Promise<SourceResult> {
  const fromDate = new Date(Date.now() - 2 * 365 * 86400_000)
    .toISOString()
    .slice(0, 10);
  const toDate = new Date().toISOString().slice(0, 10);

  const params = new URLSearchParams({
    fromDate,
    toDate,
    alertlevel: "Green;Orange;Red",
    country: "Sierra Leone",
  });

  try {
    const res = await fetch(
      `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`GDACS responded ${res.status}`);
    const data = (await res.json()) as GdacsResponse;

    const signals: SignalCandidate[] = [];
    const now = Date.now();

    for (const f of data.features) {
      const category = EVENT_TYPE_MAP[f.properties.eventtype];
      if (!category) continue;

      const ageDays =
        (now - new Date(f.properties.todate).getTime()) / 86400_000;
      const isActive = f.properties.iscurrent === "true" || ageDays < 21;
      if (!isActive) continue;

      const [lon, lat] = f.geometry.coordinates;
      let nearest = DISTRICTS[0];
      let nearestDist = Infinity;
      for (const d of DISTRICTS) {
        const dist = distanceKm(d.lat, d.lon, lat, lon);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = d;
        }
      }

      const recencyDecay = clamp(1 - ageDays / 30, 0.2, 1);
      const value = clamp(
        ALERT_BASE_VALUE[f.properties.alertlevel] * recencyDecay,
        0,
        100,
      );

      signals.push({
        districtId: nearest.id,
        category,
        source: "GDACS",
        value,
        unit: "alert level composite",
        summary: `${f.properties.alertlevel} alert: ${f.properties.name} (source: ${f.properties.source})`,
        metadata: { eventUrl: f.properties.url.report, alertlevel: f.properties.alertlevel },
        observedAt: new Date(f.properties.fromdate),
      });
    }

    return {
      source: "GDACS",
      signals,
      itemsFetched: data.features.length,
      status: "success",
    };
  } catch (err) {
    return {
      source: "GDACS",
      signals: [],
      itemsFetched: 0,
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
