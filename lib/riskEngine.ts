// Composite multi-hazard risk engine.
//
// score = hazardIntensity * 0.55 + exposure * 0.25 + vulnerability * 0.20
//
// - hazardIntensity: mean of this run's normalized (0-100) signals for the
//   (district, category) pair, blended across every source that reported one.
// - exposure: population density, min-max normalized across all 16 districts
//   (0-100) — a simple stand-in for the "population in the hazard footprint"
//   exposure metric used by PDC DisasterAWARE / INFORM.
// - vulnerability: the district's static baseline vulnerability index * 100.
//
// Thresholds mirror GDACS-style alert semantics: Green < 25, Yellow < 50,
// Orange < 75, Red >= 75 (see lib/hazards.ts scoreToLevel).
import { prisma } from "@/lib/prisma";
import { DISTRICTS, findDistrict } from "@/lib/districts";
import { scoreToLevel, HAZARD_LIST, type HazardCategory, type RiskLevel } from "@/lib/hazards";
import { clamp } from "@/lib/geo";
import type { SourceResult } from "@/lib/sources";
import { sendPushForAlerts } from "@/lib/push";

interface ComputedRow {
  districtId: string;
  category: HazardCategory;
  score: number;
  level: RiskLevel;
  drivers: string;
}

export function densityExposureMap(): Map<string, number> {
  const densities = DISTRICTS.map((d) => d.population / d.areaKm2);
  const min = Math.min(...densities);
  const max = Math.max(...densities);
  const map = new Map<string, number>();
  DISTRICTS.forEach((d, i) => {
    const norm = max > min ? ((densities[i] - min) / (max - min)) * 100 : 50;
    map.set(d.id, norm);
  });
  return map;
}

export async function persistSignals(results: SourceResult[]): Promise<number> {
  const rows = results.flatMap((r) => r.signals);
  if (rows.length === 0) return 0;
  await prisma.hazardSignal.createMany({
    data: rows.map((s) => ({
      districtId: s.districtId,
      category: s.category,
      source: s.source,
      value: s.value,
      unit: s.unit,
      summary: s.summary,
      metadata: s.metadata ? JSON.stringify(s.metadata) : null,
      observedAt: s.observedAt,
    })),
  });
  return rows.length;
}

// Low elevation concentrates runoff and is where floodwater actually
// collects — a well-established exposure multiplier for flood risk
// specifically. 0m -> +40% exposure, ~100m -> neutral, 250m+ -> floor.
export function elevationExposureFactor(elevation: number | null | undefined): number {
  if (elevation == null) return 1;
  return clamp(1.4 - elevation / 250, 0.7, 1.4);
}

export const ELEVATION_SENSITIVE_CATEGORIES = new Set<HazardCategory>(["FLOOD_RIVER", "FLOOD_COASTAL"]);

export async function computeAndPersistRiskScores(
  results: SourceResult[],
): Promise<ComputedRow[]> {
  const grouped = new Map<
    string,
    { values: number[]; sources: string[]; summaries: string[] }
  >();

  for (const r of results) {
    for (const s of r.signals) {
      const key = `${s.districtId}|${s.category}`;
      const g = grouped.get(key) ?? { values: [], sources: [], summaries: [] };
      g.values.push(s.value);
      g.sources.push(s.source);
      if (s.summary) g.summaries.push(s.summary);
      grouped.set(key, g);
    }
  }

  const exposureMap = densityExposureMap();
  const elevationRows = await prisma.district.findMany({ select: { id: true, elevation: true } });
  const elevationMap = new Map(elevationRows.map((d) => [d.id, d.elevation]));
  const rows: ComputedRow[] = [];

  for (const [key, g] of grouped) {
    const [districtId, category] = key.split("|") as [string, HazardCategory];
    const district = findDistrict(districtId);
    if (!district) continue;

    const hazardIntensity = g.values.reduce((a, b) => a + b, 0) / g.values.length;
    let exposure = exposureMap.get(districtId) ?? 50;
    const elevation = elevationMap.get(districtId);
    if (ELEVATION_SENSITIVE_CATEGORIES.has(category)) {
      exposure = clamp(exposure * elevationExposureFactor(elevation), 0, 100);
    }
    const vulnerability = district.vulnerabilityIndex * 100;
    const score = clamp(
      hazardIntensity * 0.55 + exposure * 0.25 + vulnerability * 0.2,
      0,
      100,
    );

    rows.push({
      districtId,
      category,
      score,
      level: scoreToLevel(score),
      drivers: JSON.stringify({
        hazardIntensity: Math.round(hazardIntensity * 10) / 10,
        exposure: Math.round(exposure * 10) / 10,
        vulnerability: Math.round(vulnerability * 10) / 10,
        elevationM: elevation ?? null,
        sources: [...new Set(g.sources)],
        notes: g.summaries.slice(0, 4),
      }),
    });
  }

  // Tsunami is derived, not independently sourced: Sierra Leone sits on a
  // passive Atlantic continental margin (no subduction zone), so baseline
  // risk is low; it is driven by the same-run earthquake composite for
  // coastal districts only, heavily discounted.
  const exposureMapForTsunami = exposureMap;
  for (const district of DISTRICTS.filter((d) => d.coastal)) {
    const eqRow = rows.find(
      (r) => r.districtId === district.id && r.category === "EARTHQUAKE",
    );
    const hazardIntensity = eqRow ? clamp(eqRow.score - 20, 0, 100) * 0.4 : 2;
    const exposure = exposureMapForTsunami.get(district.id) ?? 50;
    const vulnerability = district.vulnerabilityIndex * 100;
    const score = clamp(
      hazardIntensity * 0.6 + exposure * 0.25 + vulnerability * 0.15,
      0,
      100,
    );
    rows.push({
      districtId: district.id,
      category: "TSUNAMI",
      score,
      level: scoreToLevel(score),
      drivers: JSON.stringify({
        hazardIntensity: Math.round(hazardIntensity * 10) / 10,
        exposure: Math.round(exposure * 10) / 10,
        vulnerability: Math.round(vulnerability * 10) / 10,
        sources: ["DERIVED_FROM_EARTHQUAKE"],
        notes: [
          "Sierra Leone sits on a passive Atlantic margin — tsunami risk is low but monitored via regional seismic activity. Consult NOAA PTWC / GDACS for authoritative tsunami warnings.",
        ],
      }),
    });
  }

  if (rows.length > 0) {
    await prisma.riskScore.createMany({ data: rows });
    await syncAlerts(rows);
  }

  return rows;
}

async function syncAlerts(rows: ComputedRow[]): Promise<void> {
  const risky = rows.filter((r) => r.level === "ORANGE" || r.level === "RED");
  const riskyKeys = new Set(risky.map((r) => `${r.districtId}|${r.category}`));

  const activeAlerts = await prisma.alert.findMany({ where: { active: true } });
  const toDeactivate = activeAlerts.filter(
    (a) => !riskyKeys.has(`${a.districtId}|${a.category}`),
  );
  if (toDeactivate.length > 0) {
    await prisma.alert.updateMany({
      where: { id: { in: toDeactivate.map((a) => a.id) } },
      data: { active: false },
    });
  }

  const activeKeySet = new Set(
    activeAlerts
      .filter((a) => riskyKeys.has(`${a.districtId}|${a.category}`))
      .map((a) => `${a.districtId}|${a.category}`),
  );

  const district = (id: string) => findDistrict(id);
  const hazardLabel = (c: HazardCategory) =>
    HAZARD_LIST.find((h) => h.category === c)?.label ?? c;

  const newAlerts = risky
    .filter((r) => !activeKeySet.has(`${r.districtId}|${r.category}`))
    .map((r) => {
      const d = district(r.districtId);
      const drivers = JSON.parse(r.drivers) as { notes: string[] };
      return {
        districtId: r.districtId,
        category: r.category,
        level: r.level,
        title: `${r.level === "RED" ? "Critical" : "Warning"}: ${hazardLabel(r.category)} risk in ${d?.name ?? r.districtId}`,
        message: drivers.notes[0] ?? `Composite risk score ${Math.round(r.score)}/100.`,
        source: "SL-DISASTER-WATCH RISK ENGINE",
      };
    });

  if (newAlerts.length > 0) {
    await prisma.alert.createMany({ data: newAlerts });
    await sendPushForAlerts(newAlerts);
  }
}
