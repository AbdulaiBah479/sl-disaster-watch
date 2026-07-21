import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLatestRiskScores, getRiskHistory } from "@/lib/queries";
import { HAZARD_LIST } from "@/lib/hazards";
import type { HazardCategory } from "@/lib/hazards";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/districts/[id]">,
) {
  const { id } = await ctx.params;

  const district = await prisma.district.findUnique({ where: { id } });
  if (!district) {
    return NextResponse.json({ error: "District not found" }, { status: 404 });
  }

  const [allLatest, disasters, reports] = await Promise.all([
    getLatestRiskScores(),
    prisma.historicalDisaster.findMany({
      where: { districtId: id },
      orderBy: { date: "desc" },
    }),
    prisma.citizenReport.findMany({
      where: { districtId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const riskScores = allLatest.filter((r) => r.districtId === id);
  const history = await Promise.all(
    HAZARD_LIST.map(async (h) => ({
      category: h.category,
      series: await getRiskHistory(id, h.category as HazardCategory, 20),
    })),
  );

  return NextResponse.json({
    ...district,
    primaryCrops: JSON.parse(district.primaryCrops),
    riskScores,
    history,
    disasters,
    reports,
  });
}
