// NOAA Pacific Tsunami Warning Center — real public Atom feed (free, no key).
// https://www.tsunami.gov/?page=productRetrieval
//
// Despite the "Pacific" name, PTWC is the global forecast center for any
// M6.5+ seismic event anywhere in the world's oceans, issuing a routine
// "Information Statement" for most and a genuine Watch/Advisory/Warning
// only when a real tsunami threat is calculated — so most entries in this
// feed represent "checked, no threat", which is itself a real, live-sourced
// signal this app didn't have before (TSUNAMI previously had zero
// independent live source — see lib/riskEngine.ts's blend of this against
// the earthquake-derived heuristic).
import { XMLParser } from "fast-xml-parser";
import { distanceKm, clamp } from "@/lib/geo";

const FEED_URL = "https://www.tsunami.gov/events/xml/PHEBAtom.xml";
const FREETOWN = { lat: 8.4657, lon: -13.2317 }; // reference point for the whole SL coastline
const MAX_AGE_HOURS = 48;
const DECAY_KM = 10_000; // basin-wide bulletins stay somewhat relevant at long range

const SEVERITY_BASE: Record<string, number> = {
  Warning: 92,
  Advisory: 68,
  Watch: 52,
  Information: 4, // routine "no threat calculated" bulletin
};

export interface PtwcStatus {
  status: "success" | "error";
  elevated: boolean;
  value: number; // 0-100, only meaningful when elevated
  summary: string;
  itemsFetched: number;
  bulletinUrl?: string;
  message?: string;
}

interface AtomEntry {
  title?: string;
  updated?: string;
  "geo:lat"?: number;
  "geo:long"?: number;
  summary?: { "#text"?: string } | string;
  link?: { "@_href"?: string; "@_rel"?: string; "@_type"?: string }[];
}

function extractField(summaryText: string, label: string): string | null {
  const match = summaryText.match(new RegExp(`${label}:\\s*<\\/strong>\\s*([^<]+)`, "i"));
  return match ? match[1].trim() : null;
}

// tsunami.gov's CDN intermittently stalls when a `Cache-Control: no-store`
// request header is sent (reproduced directly: identical request without it
// succeeds every time) — so this deliberately omits `cache: "no-store"`,
// unlike safeFetchJson()'s default. One retry covers ordinary transient
// failures on top of that.
async function fetchFeedXml(): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(FEED_URL, {
        headers: { "User-Agent": "sl-disaster-watch (contact: portfolio-demo)" },
      });
      if (!res.ok) throw new Error(`tsunami.gov responded ${res.status}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

export async function fetchNoaaPtwcStatus(): Promise<PtwcStatus> {
  try {
    const xml = await fetchFeedXml();

    // stopNodes keeps <summary>'s nested <div>/<strong>/<br> markup as a raw
    // string instead of recursively parsing it into an object tree — the
    // Category/Affected Region extraction below regexes that raw HTML.
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      stopNodes: ["*.entry.summary"],
    });
    const parsed = parser.parse(xml);
    const rawEntries = parsed?.feed?.entry;
    const entries: AtomEntry[] = Array.isArray(rawEntries) ? rawEntries : rawEntries ? [rawEntries] : [];

    const now = Date.now();
    let best: { value: number; summary: string; bulletinUrl?: string } | null = null;

    for (const entry of entries) {
      const updated = entry.updated ? new Date(entry.updated).getTime() : NaN;
      const ageHours = Number.isFinite(updated) ? (now - updated) / 3_600_000 : Infinity;
      if (ageHours > MAX_AGE_HOURS) continue;

      const summaryText =
        typeof entry.summary === "string" ? entry.summary : (entry.summary?.["#text"] ?? "");
      const category = extractField(summaryText, "Category") ?? "Information";
      const base = SEVERITY_BASE[category] ?? SEVERITY_BASE.Information;
      if (base <= SEVERITY_BASE.Information) continue; // routine, not elevated

      const lat = entry["geo:lat"];
      const lon = entry["geo:long"];
      const distKm =
        typeof lat === "number" && typeof lon === "number"
          ? distanceKm(FREETOWN.lat, FREETOWN.lon, lat, lon)
          : DECAY_KM;
      const decay = clamp(1 - distKm / DECAY_KM, 0.2, 1);
      const value = clamp(base * decay, 0, 100);

      const region = extractField(summaryText, "Affected Region") ?? entry.title ?? "Unknown region";
      const bulletinUrl = Array.isArray(entry.link)
        ? entry.link.find((l) => l["@_type"] === "application/xml")?.["@_href"]
        : undefined;

      if (!best || value > best.value) {
        best = {
          value,
          summary: `PTWC ${category}: ${region.trim()}`,
          bulletinUrl,
        };
      }
    }

    if (best) {
      return {
        status: "success",
        elevated: true,
        value: best.value,
        summary: best.summary,
        itemsFetched: entries.length,
        bulletinUrl: best.bulletinUrl,
      };
    }

    return {
      status: "success",
      elevated: false,
      value: SEVERITY_BASE.Information,
      summary: "PTWC: no active tsunami Watch/Advisory/Warning in the last 48h",
      itemsFetched: entries.length,
    };
  } catch (err) {
    return {
      status: "error",
      elevated: false,
      value: 0,
      summary: "PTWC feed unreachable this run",
      itemsFetched: 0,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
