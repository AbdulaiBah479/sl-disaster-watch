import { prisma } from "@/lib/prisma";
import { getLatestRiskScores } from "@/lib/queries";
import { MapLoader } from "@/components/MapLoader";
import { AutoRefresh } from "@/components/AutoRefresh";
import type { DistrictWithRisk } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;
  const [districts, riskScores] = await Promise.all([
    prisma.district.findMany({ orderBy: { name: "asc" } }),
    getLatestRiskScores(),
  ]);

  let initialFocus: { lat: number; lon: number; zoom: number } | null = null;
  if (focus) {
    const district = districts.find((d) => d.id === focus);
    if (district) {
      initialFocus = { lat: district.lat, lon: district.lon, zoom: 13 };
    } else {
      const settlement = await prisma.settlement.findUnique({ where: { id: focus } });
      if (settlement) initialFocus = { lat: settlement.lat, lon: settlement.lon, zoom: 14 };
    }
  }

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
      <AutoRefresh />
      <div className="border-b px-4 py-3 sm:px-6" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-lg font-bold">Live Map</h1>
        <p className="text-xs text-muted">
          Toggle satellite layers (top right) to see the hazard cause directly: true-color imagery,
          vegetation health (NDVI) for drought, or IMERG precipitation for flood drivers.
        </p>
      </div>
      <div className="flex-1">
        <MapLoader districts={enriched} enableScrollZoom initialFocus={initialFocus} />
      </div>
    </div>
  );
}
