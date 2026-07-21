import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLatestSettlementRiskScores } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const districtId = searchParams.get("districtId") ?? undefined;

  const [settlements, riskScores] = await Promise.all([
    prisma.settlement.findMany({
      where: districtId ? { districtId } : undefined,
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    getLatestSettlementRiskScores(),
  ]);

  const byId = new Map<string, typeof riskScores>();
  for (const r of riskScores) {
    const list = byId.get(r.settlementId) ?? [];
    list.push(r);
    byId.set(r.settlementId, list);
  }

  const result = settlements.map((s) => {
    const scores = byId.get(s.id) ?? [];
    const overall = scores.length > 0 ? scores.reduce((a, b) => a + b.score, 0) / scores.length : 0;
    return { ...s, overallRisk: Math.round(overall * 10) / 10, riskScores: scores };
  });

  return NextResponse.json(result);
}
