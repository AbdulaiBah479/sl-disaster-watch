// USGS Earthquake Hazards Program — FDSN Event Web Service.
// Free, public, no API key. https://earthquake.usgs.gov/fdsnws/event/1/
import { DISTRICTS, SIERRA_LEONE_BBOX } from "@/lib/districts";
import { clamp, distanceKm } from "@/lib/geo";
import type { SourceResult } from "./types";

interface UsgsFeature {
  properties: {
    mag: number;
    place: string;
    time: number;
    url: string;
  };
  geometry: {
    coordinates: [number, number, number];
  };
}

interface UsgsResponse {
  features: UsgsFeature[];
}

const RELEVANCE_RADIUS_KM = 900;

export async function fetchUsgsEarthquakeSignals(): Promise<SourceResult> {
  const buffer = 4;
  const params = new URLSearchParams({
    format: "geojson",
    starttime: new Date(Date.now() - 180 * 86400_000).toISOString().slice(0, 10),
    minmagnitude: "2.5",
    minlatitude: String(SIERRA_LEONE_BBOX.minLat - buffer),
    maxlatitude: String(SIERRA_LEONE_BBOX.maxLat + buffer),
    minlongitude: String(SIERRA_LEONE_BBOX.minLon - buffer),
    maxlongitude: String(SIERRA_LEONE_BBOX.maxLon + buffer),
    orderby: "time",
  });

  try {
    const res = await fetch(
      `https://earthquake.usgs.gov/fdsnws/event/1/query?${params.toString()}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`USGS responded ${res.status}`);
    const data = (await res.json()) as UsgsResponse;

    const signals = DISTRICTS.map((district) => {
      let composite = 0;
      let closestEvent: { mag: number; dist: number; place: string } | null =
        null;

      for (const f of data.features) {
        const [lon, lat] = f.geometry.coordinates;
        const dist = distanceKm(district.lat, district.lon, lat, lon);
        if (dist > RELEVANCE_RADIUS_KM) continue;
        const contribution = clamp(
          f.properties.mag * 11 - dist / 25,
          0,
          100,
        );
        composite += contribution;
        if (!closestEvent || dist < closestEvent.dist) {
          closestEvent = { mag: f.properties.mag, dist, place: f.properties.place };
        }
      }

      return {
        districtId: district.id,
        category: "EARTHQUAKE" as const,
        source: "USGS",
        value: clamp(composite, 0, 100),
        unit: "composite index",
        summary: closestEvent
          ? `Nearest recent event: M${closestEvent.mag.toFixed(1)} ${closestEvent.place} (~${Math.round(closestEvent.dist)} km away)`
          : "No significant seismic activity detected within monitoring radius (last 180 days).",
        metadata: { eventsConsidered: data.features.length },
        observedAt: new Date(),
      };
    });

    return {
      source: "USGS",
      signals,
      itemsFetched: data.features.length,
      status: "success",
    };
  } catch (err) {
    return {
      source: "USGS",
      signals: [],
      itemsFetched: 0,
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
