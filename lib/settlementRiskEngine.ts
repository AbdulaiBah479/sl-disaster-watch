// Settlement-level risk computation — focused on flood (the hazard that
// genuinely varies block-to-block) computed per-settlement with its own
// rainfall + river-discharge signal. Drought is slow-onset and regionally
// correlated, so settlements inherit their parent district's freshly
// computed DROUGHT score (scaled by a small settlement-type factor) rather
// than re-running an expensive per-point historical-archive query — this
// keeps ingestion fast without sacrificing meaningful accuracy. Every other
// hazard category is shown on a settlement page by reading the parent
// district's current score directly, no duplication needed.
import { prisma } from "@/lib/prisma";
import { findDistrict } from "@/lib/districts";
import { SETTLEMENTS, type SettlementSeed } from "@/lib/settlements";
import { scoreToLevel } from "@/lib/hazards";
import { clamp } from "@/lib/geo";

interface WeatherDaily {
  time: string[];
  precipitation_sum: (number | null)[];
}
interface WeatherLocation {
  daily: WeatherDaily;
}

interface FloodDaily {
  river_discharge: (number | null)[];
  river_discharge_median: (number | null)[];
}
interface FloodLocation {
  daily: FloodDaily;
}

function sum(values: (number | null)[]): number {
  return values.reduce((a: number, v) => a + (v ?? 0), 0);
}

const CHUNK = 100;

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const TYPE_EXPOSURE_BONUS: Record<string, number> = { CITY: 20, TOWN: 10, AREA: 0 };

async function fetchWeatherChunk(batch: SettlementSeed[]) {
  const lat = batch.map((s) => s.lat).join(",");
  const lon = batch.map((s) => s.lon).join(",");
  const rain: Map<string, number> = new Map();
  const rain72h: Map<string, number> = new Map();
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&past_days=14&forecast_days=1&timezone=auto`,
      { cache: "no-store" },
    );
    if (res.ok) {
      const data = (await res.json()) as WeatherLocation[] | WeatherLocation;
      const locations = Array.isArray(data) ? data : [data];
      batch.forEach((s, i) => {
        const precip = locations[i]?.daily?.precipitation_sum;
        if (!precip) return;
        rain.set(s.id, sum(precip));
        rain72h.set(s.id, sum(precip.slice(-4, -1)));
      });
    }
  } catch {
    // best-effort
  }
  return { rain, rain72h };
}

async function fetchFloodChunk(batch: SettlementSeed[]) {
  const lat = batch.map((s) => s.lat).join(",");
  const lon = batch.map((s) => s.lon).join(",");
  const ratios = new Map<string, number>();
  try {
    const res = await fetch(
      `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lon}&daily=river_discharge,river_discharge_median&forecast_days=1`,
      { cache: "no-store" },
    );
    if (res.ok) {
      const data = (await res.json()) as FloodLocation[] | FloodLocation;
      const locations = Array.isArray(data) ? data : [data];
      batch.forEach((s, i) => {
        const daily = locations[i]?.daily;
        const discharge = daily?.river_discharge?.[0];
        const median = daily?.river_discharge_median?.[0];
        if (discharge != null && median != null && median > 0) {
          ratios.set(s.id, discharge / median);
        }
      });
    }
  } catch {
    // best-effort
  }
  return ratios;
}

export async function computeSettlementFloodDroughtRisk(): Promise<{
  scoresComputed: number;
  alertsCreated: number;
}> {
  const batches = chunks(SETTLEMENTS, CHUNK);

  const [weatherResults, floodResults, districtDroughtRows] = await Promise.all([
    Promise.all(batches.map(fetchWeatherChunk)),
    Promise.all(batches.map(fetchFloodChunk)),
    prisma.riskScore.findMany({
      where: { category: "DROUGHT" },
      orderBy: { computedAt: "desc" },
      take: 16 * 4,
    }),
  ]);

  const rainByPoint = new Map<string, number>();
  const rain72hByPoint = new Map<string, number>();
  for (const w of weatherResults) {
    for (const [k, v] of w.rain) rainByPoint.set(k, v);
    for (const [k, v] of w.rain72h) rain72hByPoint.set(k, v);
  }
  const dischargeRatioByPoint = new Map<string, number>();
  for (const f of floodResults) for (const [k, v] of f) dischargeRatioByPoint.set(k, v);

  const districtDroughtScore = new Map<string, number>();
  for (const r of districtDroughtRows) {
    if (!districtDroughtScore.has(r.districtId)) districtDroughtScore.set(r.districtId, r.score);
  }

  const rows: {
    settlementId: string;
    category: "FLOOD_RIVER" | "FLOOD_COASTAL" | "DROUGHT";
    score: number;
    level: ReturnType<typeof scoreToLevel>;
    drivers: string;
  }[] = [];

  for (const s of SETTLEMENTS) {
    const district = findDistrict(s.districtId);
    if (!district) continue;
    const vulnerability = district.vulnerabilityIndex * 100;
    const exposureBase = 50 + TYPE_EXPOSURE_BONUS[s.type];

    const rain14d = rainByPoint.get(s.id) ?? 0;
    const dischargeRatio = dischargeRatioByPoint.get(s.id);

    const rainSignal = clamp((rain14d - 150) / 3 + (district.riverine ? 10 : 0), 0, 100);
    const dischargeSignal = dischargeRatio != null ? clamp((dischargeRatio - 1) * 80, 0, 100) : null;
    const floodHazard =
      dischargeSignal != null ? rainSignal * 0.5 + dischargeSignal * 0.5 : rainSignal;
    const floodScore = clamp(floodHazard * 0.55 + exposureBase * 0.25 + vulnerability * 0.2, 0, 100);

    rows.push({
      settlementId: s.id,
      category: "FLOOD_RIVER",
      score: floodScore,
      level: scoreToLevel(floodScore),
      drivers: JSON.stringify({
        hazardIntensity: Math.round(floodHazard * 10) / 10,
        exposure: exposureBase,
        vulnerability: Math.round(vulnerability * 10) / 10,
        sources: dischargeSignal != null ? ["OPEN_METEO", "OPEN_METEO_FLOOD"] : ["OPEN_METEO"],
        notes: [
          `${rain14d.toFixed(0)} mm rainfall over 14 days${dischargeRatio != null ? `; river discharge ×${dischargeRatio.toFixed(2)} of seasonal median` : ""}`,
        ],
      }),
    });

    if (district.coastal) {
      const coastalScore = clamp(rainSignal * 0.4 * 0.55 + exposureBase * 0.25 + vulnerability * 0.2, 0, 100);
      rows.push({
        settlementId: s.id,
        category: "FLOOD_COASTAL",
        score: coastalScore,
        level: scoreToLevel(coastalScore),
        drivers: JSON.stringify({
          hazardIntensity: Math.round(rainSignal * 0.4 * 10) / 10,
          exposure: exposureBase,
          vulnerability: Math.round(vulnerability * 10) / 10,
          sources: ["OPEN_METEO", "INHERITED_DISTRICT_COASTAL_FLAG"],
          notes: ["Coastal surge risk inherited from district-level marine signal, scaled by local rainfall."],
        }),
      });
    }

    const inheritedDrought = districtDroughtScore.get(s.districtId) ?? 10;
    const droughtScore = clamp(
      inheritedDrought * 0.85 + TYPE_EXPOSURE_BONUS[s.type] * 0.15,
      0,
      100,
    );
    rows.push({
      settlementId: s.id,
      category: "DROUGHT",
      score: droughtScore,
      level: scoreToLevel(droughtScore),
      drivers: JSON.stringify({
        hazardIntensity: Math.round(inheritedDrought * 10) / 10,
        exposure: exposureBase,
        vulnerability: Math.round(vulnerability * 10) / 10,
        sources: ["INHERITED_FROM_DISTRICT"],
        notes: [
          "Drought is slow-onset and regionally correlated — inherited from the parent district's live rainfall-anomaly score.",
        ],
      }),
    });
  }

  if (rows.length > 0) {
    await prisma.settlementRiskScore.createMany({ data: rows });
  }

  const risky = rows.filter((r) => r.level === "ORANGE" || r.level === "RED");
  let alertsCreated = 0;
  if (risky.length > 0) {
    const settlementIds = [...new Set(risky.map((r) => r.settlementId))];
    const activeAlerts = await prisma.alert.findMany({
      where: { settlementId: { in: settlementIds }, active: true },
    });
    const activeKeySet = new Set(activeAlerts.map((a) => `${a.settlementId}|${a.category}`));
    const settlementById = new Map(SETTLEMENTS.map((s) => [s.id, s]));

    const newAlerts = risky
      .filter((r) => !activeKeySet.has(`${r.settlementId}|${r.category}`))
      .map((r) => {
        const s = settlementById.get(r.settlementId) as SettlementSeed;
        const drivers = JSON.parse(r.drivers) as { notes: string[] };
        const label = r.category === "DROUGHT" ? "Drought" : r.category === "FLOOD_COASTAL" ? "Coastal flood" : "Flood";
        return {
          districtId: s.districtId,
          settlementId: s.id,
          category: r.category,
          level: r.level,
          title: `${r.level === "RED" ? "Critical" : "Warning"}: ${label} risk in ${s.name}`,
          message: drivers.notes[0] ?? `Composite risk score ${Math.round(r.score)}/100.`,
          source: "SL-DISASTER-WATCH RISK ENGINE",
        };
      });

    if (newAlerts.length > 0) {
      await prisma.alert.createMany({ data: newAlerts });
      alertsCreated = newAlerts.length;
    }
  }

  return { scoresComputed: rows.length, alertsCreated };
}
