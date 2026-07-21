import { prisma } from "@/lib/prisma";
import { fetchElevations } from "@/lib/sources/openMeteoElevation";

// Elevation never changes, so we only fetch it for rows that don't have it
// yet. Cheap to call every ingestion run — it's a no-op once populated.
export async function backfillElevations(): Promise<number> {
  const [districts, settlements] = await Promise.all([
    prisma.district.findMany({ where: { elevation: null }, select: { id: true, lat: true, lon: true } }),
    prisma.settlement.findMany({ where: { elevation: null }, select: { id: true, lat: true, lon: true } }),
  ]);

  const points = [...districts, ...settlements];
  if (points.length === 0) return 0;

  const elevations = await fetchElevations(points);

  const districtUpdates = districts
    .filter((d) => elevations.has(d.id))
    .map((d) => prisma.district.update({ where: { id: d.id }, data: { elevation: elevations.get(d.id) } }));
  const settlementUpdates = settlements
    .filter((s) => elevations.has(s.id))
    .map((s) => prisma.settlement.update({ where: { id: s.id }, data: { elevation: elevations.get(s.id) } }));

  await Promise.all([...districtUpdates, ...settlementUpdates]);
  return districtUpdates.length + settlementUpdates.length;
}
