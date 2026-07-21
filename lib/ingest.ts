import { prisma } from "@/lib/prisma";
import { runAllSources } from "@/lib/sources";
import { persistSignals, computeAndPersistRiskScores } from "@/lib/riskEngine";
import { computeSettlementFloodDroughtRisk } from "@/lib/settlementRiskEngine";
import { backfillElevations } from "@/lib/elevationBackfill";

export interface IngestSummary {
  startedAt: string;
  finishedAt: string;
  totalSignals: number;
  totalRiskScores: number;
  settlementScoresComputed: number;
  elevationsBackfilled: number;
  sources: {
    source: string;
    status: string;
    itemsFetched: number;
    message?: string;
  }[];
}

export async function runIngestion(): Promise<IngestSummary> {
  const startedAt = new Date();

  const [results, elevationsBackfilled] = await Promise.all([
    runAllSources(),
    backfillElevations(),
  ]);

  const [totalSignals, riskRows] = await Promise.all([
    persistSignals(results),
    computeAndPersistRiskScores(results),
  ]);
  const { scoresComputed: settlementScoresComputed } = await computeSettlementFloodDroughtRisk();

  await prisma.ingestionRun.createMany({
    data: [
      ...results.map((r) => ({
        source: r.source,
        status: r.status,
        itemsFetched: r.itemsFetched,
        message: r.message,
        startedAt,
        finishedAt: new Date(),
      })),
      {
        source: "SETTLEMENT_RISK_ENGINE",
        status: "success",
        itemsFetched: settlementScoresComputed,
        message: null,
        startedAt,
        finishedAt: new Date(),
      },
    ],
  });

  const finishedAt = new Date();

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    totalSignals,
    totalRiskScores: riskRows.length,
    settlementScoresComputed,
    elevationsBackfilled,
    sources: results.map((r) => ({
      source: r.source,
      status: r.status,
      itemsFetched: r.itemsFetched,
      message: r.message,
    })),
  };
}
