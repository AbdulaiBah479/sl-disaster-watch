// Open-Meteo Elevation API — free, no API key. https://open-meteo.com/en/docs/elevation-api
// Elevation is static, so this is fetched once per point (district or
// settlement) and cached as a DB column rather than re-pulled every
// ingestion run. Low elevation near a river/coast is a real, well-established
// flood-exposure multiplier, and a strong secondary landslide-runoff factor.
export interface ElevationQueryPoint {
  id: string;
  lat: number;
  lon: number;
}

export async function fetchElevations(
  points: ElevationQueryPoint[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (points.length === 0) return result;

  // Open-Meteo accepts long comma-separated coordinate lists but we chunk
  // defensively so a single oversized request can't fail the whole batch.
  const CHUNK = 100;
  const chunks: ElevationQueryPoint[][] = [];
  for (let i = 0; i < points.length; i += CHUNK) chunks.push(points.slice(i, i + CHUNK));

  await Promise.all(
    chunks.map(async (chunk) => {
      const lat = chunk.map((p) => p.lat).join(",");
      const lon = chunk.map((p) => p.lon).join(",");
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { elevation: number[] };
        chunk.forEach((p, idx) => {
          const el = data.elevation?.[idx];
          if (typeof el === "number") result.set(p.id, el);
        });
      } catch {
        // best-effort: elevation is an enrichment factor, not critical path
      }
    }),
  );
  return result;
}
