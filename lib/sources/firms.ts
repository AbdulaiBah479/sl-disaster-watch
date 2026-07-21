// NASA FIRMS (Fire Information for Resource Management System) — active fire
// hotspot detections from VIIRS. Free but requires a personal MAP_KEY:
// https://firms.modaps.eosdis.nasa.gov/api/map_key/
// Set FIRMS_MAP_KEY in .env to enable live satellite fire detection.
//
// Without a key, falls back to a seasonal bush-fire climatology: Sierra
// Leone's dry season (Dec-Apr) sees widespread slash-and-burn agricultural
// burning and elevated bush fire incidence; the wet season (May-Nov) does
// not. This keeps the WILDFIRE category populated even without the key.
import { DISTRICTS, SIERRA_LEONE_BBOX } from "@/lib/districts";
import { clamp, distanceKm } from "@/lib/geo";
import type { SignalCandidate, SourceResult } from "./types";

const HOTSPOT_ASSIGNMENT_RADIUS_KM = 45;

function seasonalBaseline(): SourceResult {
  const month = new Date().getMonth(); // 0=Jan
  const dryMonths = new Set([11, 0, 1, 2, 3]); // Dec-Apr
  const value = dryMonths.has(month) ? 32 : 8;

  const signals: SignalCandidate[] = DISTRICTS.map((d) => ({
    districtId: d.id,
    category: "WILDFIRE",
    source: "MODEL_SEASONAL",
    value,
    unit: "seasonal climatology index",
    summary: dryMonths.has(month)
      ? "Dry-season bush burning climatology (no live satellite key configured)"
      : "Wet-season baseline — low bush fire climatology (no live satellite key configured)",
    metadata: { month },
    observedAt: new Date(),
  }));

  return {
    source: "FIRMS",
    signals,
    itemsFetched: 0,
    status: "partial",
    message:
      "FIRMS_MAP_KEY not configured — using seasonal climatology fallback. Get a free key at https://firms.modaps.eosdis.nasa.gov/api/map_key/",
  };
}

export async function fetchFirmsSignals(): Promise<SourceResult> {
  const mapKey = process.env.FIRMS_MAP_KEY;
  if (!mapKey) return seasonalBaseline();

  const { minLon, minLat, maxLon, maxLat } = SIERRA_LEONE_BBOX;
  const area = `${minLon},${minLat},${maxLon},${maxLat}`;
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/${area}/3`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`FIRMS responded ${res.status}`);
    const csv = await res.text();
    const lines = csv.trim().split("\n");
    if (lines.length <= 1) {
      return {
        source: "FIRMS",
        signals: DISTRICTS.map((d) => ({
          districtId: d.id,
          category: "WILDFIRE" as const,
          source: "FIRMS",
          value: 0,
          unit: "hotspot count (72h)",
          summary: "No active fire hotspots detected in the past 72 hours",
          metadata: {},
          observedAt: new Date(),
        })),
        itemsFetched: 0,
        status: "success",
      };
    }

    const header = lines[0].split(",");
    const latIdx = header.indexOf("latitude");
    const lonIdx = header.indexOf("longitude");
    const confIdx = header.indexOf("confidence");

    const hotspots = lines.slice(1).map((line) => {
      const cols = line.split(",");
      return {
        lat: parseFloat(cols[latIdx]),
        lon: parseFloat(cols[lonIdx]),
        confidence: cols[confIdx],
      };
    });

    const counts = new Map<string, number>();
    for (const hs of hotspots) {
      let nearest = DISTRICTS[0];
      let nearestDist = Infinity;
      for (const d of DISTRICTS) {
        const dist = distanceKm(d.lat, d.lon, hs.lat, hs.lon);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = d;
        }
      }
      if (nearestDist <= HOTSPOT_ASSIGNMENT_RADIUS_KM) {
        counts.set(nearest.id, (counts.get(nearest.id) ?? 0) + 1);
      }
    }

    const signals: SignalCandidate[] = DISTRICTS.map((d) => {
      const count = counts.get(d.id) ?? 0;
      return {
        districtId: d.id,
        category: "WILDFIRE",
        source: "FIRMS",
        value: clamp(count * 14, 0, 100),
        unit: "hotspot count (72h)",
        summary:
          count > 0
            ? `${count} active fire hotspot(s) detected within ${HOTSPOT_ASSIGNMENT_RADIUS_KM} km in the past 72 hours`
            : "No active fire hotspots detected in the past 72 hours",
        metadata: { count },
        observedAt: new Date(),
      };
    });

    return {
      source: "FIRMS",
      signals,
      itemsFetched: hotspots.length,
      status: "success",
    };
  } catch (err) {
    return {
      source: "FIRMS",
      signals: [],
      itemsFetched: 0,
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
