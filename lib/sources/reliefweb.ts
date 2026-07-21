// ReliefWeb API (OCHA) — free, but requires a pre-approved `appname` since
// Nov 2025 (https://apidoc.reliefweb.int/parameters#appname). Request one at
// that URL and set RELIEFWEB_APPNAME in .env; this source no-ops until then.
//
// Used as a national situational-awareness signal for hazards that have no
// other live feed: human epidemics and livestock disease. ReliefWeb reports
// aren't reliably geotagged below country level, so the resulting signal is
// applied uniformly across all districts and clearly labeled as a national
// (not district-specific) indicator.
import { DISTRICTS } from "@/lib/districts";
import { clamp } from "@/lib/geo";
import type { HazardCategory } from "@/lib/hazards";
import type { SignalCandidate, SourceResult } from "./types";

interface ReliefWebReport {
  fields: {
    title: string;
    date: { created: string };
    url_alias?: string;
    source?: { name: string }[];
  };
}

interface ReliefWebResponse {
  totalCount: number;
  data: ReliefWebReport[];
}

const KEYWORDS: { category: HazardCategory; terms: string[] }[] = [
  {
    category: "EPIDEMIC_HUMAN",
    terms: [
      "cholera",
      "lassa",
      "mpox",
      "monkeypox",
      "ebola",
      "measles",
      "meningitis",
      "outbreak",
      "epidemic",
    ],
  },
  {
    category: "EPIDEMIC_ANIMAL",
    terms: [
      "livestock",
      "poultry",
      "swine fever",
      "newcastle disease",
      "anthrax",
      "foot and mouth",
      "avian influenza",
      "epizootic",
    ],
  },
];

export async function fetchReliefWebSignals(): Promise<SourceResult> {
  const appname = process.env.RELIEFWEB_APPNAME;
  if (!appname) {
    return {
      source: "RELIEFWEB",
      signals: [],
      itemsFetched: 0,
      status: "partial",
      message:
        "RELIEFWEB_APPNAME not configured — request a free appname at https://apidoc.reliefweb.int/parameters#appname and set it in .env to enable this source.",
    };
  }

  try {
    const res = await fetch(
      `https://api.reliefweb.int/v2/reports?appname=${encodeURIComponent(appname)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter: { field: "primary_country", value: "Sierra Leone" },
          sort: ["date:desc"],
          limit: 50,
          fields: {
            include: ["title", "date.created", "url_alias", "source.name"],
          },
        }),
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error(`ReliefWeb responded ${res.status}`);
    const data = (await res.json()) as ReliefWebResponse;

    const now = Date.now();
    const matchesByCategory = new Map<
      HazardCategory,
      { title: string; url?: string; ageDays: number }[]
    >();

    for (const report of data.data) {
      const title = report.fields.title.toLowerCase();
      const ageDays =
        (now - new Date(report.fields.date.created).getTime()) / 86400_000;
      if (ageDays > 90) continue;

      for (const { category, terms } of KEYWORDS) {
        if (terms.some((t) => title.includes(t))) {
          const list = matchesByCategory.get(category) ?? [];
          list.push({
            title: report.fields.title,
            url: report.fields.url_alias,
            ageDays,
          });
          matchesByCategory.set(category, list);
        }
      }
    }

    const signals: SignalCandidate[] = [];
    for (const [category, matches] of matchesByCategory) {
      const recencyWeighted = matches.reduce(
        (acc, m) => acc + clamp(1 - m.ageDays / 90, 0.1, 1),
        0,
      );
      const value = clamp(recencyWeighted * 22, 0, 100);
      const latest = matches[0];

      for (const district of DISTRICTS) {
        signals.push({
          districtId: district.id,
          category,
          source: "RELIEFWEB",
          value,
          unit: "national situational signal",
          summary: `${matches.length} recent ReliefWeb report(s) mention this hazard nationally — latest: "${latest.title}"`,
          metadata: { url: latest.url, matchCount: matches.length },
          observedAt: new Date(),
        });
      }
    }

    return {
      source: "RELIEFWEB",
      signals,
      itemsFetched: data.data?.length ?? 0,
      status: "success",
    };
  } catch (err) {
    return {
      source: "RELIEFWEB",
      signals: [],
      itemsFetched: 0,
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
