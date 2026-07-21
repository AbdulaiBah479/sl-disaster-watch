import { prisma } from "@/lib/prisma";
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
