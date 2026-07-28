import { prisma } from "@/lib/prisma";
import { findDistrict } from "@/lib/districts";
import { SETTLEMENTS } from "@/lib/settlements";
import type { HazardCategory, RiskLevel } from "@/lib/hazards";

export interface LatestRiskScore {
  districtId: string;
  category: HazardCategory;
  score: number;
  level: RiskLevel;
  drivers: { hazardIntensity: number; exposure: number; vulnerability: number; sources: string[]; notes: string[] };
  computedAt: string;
}

// RiskScore is an append-only log; keep only the newest row per
// (district, category). Dataset is small (16 districts x 13 categories),
// so reducing in JS is simpler and more portable than a raw window-function
// query.
export async function getLatestRiskScores(): Promise<LatestRiskScore[]> {
  const rows = await prisma.riskScore.findMany({
    orderBy: { computedAt: "desc" },
    take: 16 * 13 * 6,
  });

  const seen = new Set<string>();
  const latest: LatestRiskScore[] = [];
  for (const r of rows) {
    const key = `${r.districtId}|${r.category}`;
    if (seen.has(key)) continue;
    seen.add(key);
    latest.push({
      districtId: r.districtId,
      category: r.category as HazardCategory,
      score: r.score,
      level: r.level as RiskLevel,
      drivers: JSON.parse(r.drivers),
      computedAt: r.computedAt.toISOString(),
    });
  }
  return latest;
}

export async function getRiskHistory(
  districtId: string,
  category: HazardCategory,
  limit = 30,
) {
  const rows = await prisma.riskScore.findMany({
    where: { districtId, category },
    orderBy: { computedAt: "desc" },
    take: limit,
  });
  return rows
    .map((r) => ({ score: r.score, level: r.level, computedAt: r.computedAt.toISOString() }))
    .reverse();
}

export interface LatestSettlementRiskScore {
  settlementId: string;
  category: HazardCategory;
  score: number;
  level: RiskLevel;
  drivers: { hazardIntensity: number; exposure: number; vulnerability: number; sources: string[]; notes: string[] };
  computedAt: string;
}

// Settlements only carry FLOOD_RIVER / FLOOD_COASTAL / DROUGHT rows (see
// lib/settlementRiskEngine.ts), so this table is much smaller per point.
export async function getLatestSettlementRiskScores(): Promise<LatestSettlementRiskScore[]> {
  const rows = await prisma.settlementRiskScore.findMany({
    orderBy: { computedAt: "desc" },
    take: 400 * 3 * 4,
  });

  const seen = new Set<string>();
  const latest: LatestSettlementRiskScore[] = [];
  for (const r of rows) {
    const key = `${r.settlementId}|${r.category}`;
    if (seen.has(key)) continue;
    seen.add(key);
    latest.push({
      settlementId: r.settlementId,
      category: r.category as HazardCategory,
      score: r.score,
      level: r.level as RiskLevel,
      drivers: JSON.parse(r.drivers),
      computedAt: r.computedAt.toISOString(),
    });
  }
  return latest;
}

export async function getSettlementRiskHistory(
  settlementId: string,
  category: HazardCategory,
  limit = 30,
) {
  const rows = await prisma.settlementRiskScore.findMany({
    where: { settlementId, category },
    orderBy: { computedAt: "desc" },
    take: limit,
  });
  return rows
    .map((r) => ({ score: r.score, level: r.level, computedAt: r.computedAt.toISOString() }))
    .reverse();
}

export interface LatestForecast {
  districtId: string;
  settlementId: string | null;
  category: HazardCategory;
  horizonDays: number;
  predictedScore: number;
  predictedLevel: RiskLevel;
  confidence: number;
  basis: string;
  method: string;
  generatedAt: string;
}

// RiskForecast is an append-only log (one set of rows per ingestion run);
// keep only the newest generation per (place, category, horizon).
export async function getLatestForecasts(scope?: {
  districtId?: string;
  settlementId?: string;
}): Promise<LatestForecast[]> {
  const rows = await prisma.riskForecast.findMany({
    where: scope?.settlementId
      ? { settlementId: scope.settlementId }
      : scope?.districtId
        ? { districtId: scope.districtId, settlementId: null }
        : undefined,
    orderBy: { generatedAt: "desc" },
    take: scope ? 13 * 3 * 4 : 16 * 13 * 3 * 3,
  });

  const seen = new Set<string>();
  const latest: LatestForecast[] = [];
  for (const r of rows) {
    const key = `${r.settlementId ?? r.districtId}|${r.category}|${r.horizonDays}`;
    if (seen.has(key)) continue;
    seen.add(key);
    latest.push({
      districtId: r.districtId,
      settlementId: r.settlementId,
      category: r.category as HazardCategory,
      horizonDays: r.horizonDays,
      predictedScore: r.predictedScore,
      predictedLevel: r.predictedLevel as RiskLevel,
      confidence: r.confidence,
      basis: r.basis,
      method: r.method,
      generatedAt: r.generatedAt.toISOString(),
    });
  }
  return latest;
}

export interface RisingRiskEntry {
  districtId: string;
  districtName: string;
  settlementId: string | null;
  settlementName: string | null;
  category: HazardCategory;
  currentScore: number;
  currentLevel: RiskLevel;
  horizonDays: number;
  predictedScore: number;
  predictedLevel: RiskLevel;
  confidence: number;
  basis: string;
  method: string;
}

const ESCALATION_RANK: Record<RiskLevel, number> = { GREEN: 0, YELLOW: 1, ORANGE: 2, RED: 3 };

// Places currently GREEN/YELLOW whose predicted trajectory crosses into
// ORANGE/RED at some horizon — the dashboard's forward-looking callout.
export async function getRisingRiskWatchlist(): Promise<RisingRiskEntry[]> {
  const [latestDistrict, latestSettlement, forecasts] = await Promise.all([
    getLatestRiskScores(),
    getLatestSettlementRiskScores(),
    getLatestForecasts(),
  ]);

  const currentDistrict = new Map(latestDistrict.map((r) => [`${r.districtId}|${r.category}`, r]));
  const currentSettlement = new Map(latestSettlement.map((r) => [`${r.settlementId}|${r.category}`, r]));
  const settlementById = new Map(SETTLEMENTS.map((s) => [s.id, s]));

  const entries: RisingRiskEntry[] = [];
  for (const f of forecasts) {
    if (ESCALATION_RANK[f.predictedLevel] < 2) continue; // only rows escalating to ORANGE/RED

    const current = f.settlementId
      ? currentSettlement.get(`${f.settlementId}|${f.category}`)
      : currentDistrict.get(`${f.districtId}|${f.category}`);
    if (!current) continue;
    if (ESCALATION_RANK[current.level] >= ESCALATION_RANK[f.predictedLevel]) continue; // already there or worse

    const district = findDistrict(f.districtId);
    const settlement = f.settlementId ? settlementById.get(f.settlementId) : undefined;
    if (!district) continue;

    entries.push({
      districtId: f.districtId,
      districtName: district.name,
      settlementId: f.settlementId,
      settlementName: settlement?.name ?? null,
      category: f.category,
      currentScore: current.score,
      currentLevel: current.level,
      horizonDays: f.horizonDays,
      predictedScore: f.predictedScore,
      predictedLevel: f.predictedLevel,
      confidence: f.confidence,
      basis: f.basis,
      method: f.method,
    });
  }

  entries.sort((a, b) => b.confidence - a.confidence || a.horizonDays - b.horizonDays);
  return entries;
}
