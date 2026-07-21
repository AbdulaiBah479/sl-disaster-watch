import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLatestRiskScores } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const [districts, riskScores] = await Promise.all([
    prisma.district.findMany({ orderBy: { name: "asc" } }),
    getLatestRiskScores(),
  ]);

  const byDistrict = new Map<string, typeof riskScores>();
  for (const r of riskScores) {
    const list = byDistrict.get(r.districtId) ?? [];
    list.push(r);
    byDistrict.set(r.districtId, list);
  }

  const result = districts.map((d) => {
    const scores = byDistrict.get(d.id) ?? [];
    const overall =
      scores.length > 0
        ? scores.reduce((a, b) => a + b.score, 0) / scores.length
        : 0;
    return {
      ...d,
      primaryCrops: JSON.parse(d.primaryCrops) as string[],
      overallRisk: Math.round(overall * 10) / 10,
      riskScores: scores,
    };
  });

  return NextResponse.json(result);
}
