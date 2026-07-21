import { prisma } from "@/lib/prisma";
import { getLatestRiskScores } from "@/lib/queries";
import { MapLoader } from "@/components/MapLoader";
import type { DistrictWithRisk } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MapPage() {
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

  const enriched: DistrictWithRisk[] = districts.map((d) => {
    const scores = byDistrict.get(d.id) ?? [];
    const overall = scores.length > 0 ? scores.reduce((a, b) => a + b.score, 0) / scores.length : 0;
    return {
      ...d,
      primaryCrops: JSON.parse(d.primaryCrops),
      overallRisk: Math.round(overall * 10) / 10,
      riskScores: scores,
    };
  });

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col">
      <div className="border-b px-4 py-3 sm:px-6" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-lg font-bold">Live Map</h1>
        <p className="text-xs text-muted">
          Toggle satellite layers (top right) to see the hazard cause directly: true-color imagery,
          vegetation health (NDVI) for drought, or IMERG precipitation for flood drivers.
        </p>
      </div>
      <div className="flex-1">
        <MapLoader districts={enriched} />
      </div>
    </div>
  );
}
