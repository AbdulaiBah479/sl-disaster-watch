// Predictive risk trajectory engine — a statistical trend + real-forecast
// ensemble, deliberately NOT an LLM/black-box model. It projects each
// (district or settlement, hazard) composite score 1/3/7 days ahead using:
//
//  1. A linear trend fit over this pair's RiskScore/SettlementRiskScore
//     history (lib/queries.ts getRiskHistory/getSettlementRiskHistory),
//     regressed against actual elapsed days since ingestion is on-demand
//     and not a fixed daily cadence.
//  2. For the three categories with a genuine forward-looking public data
//     source (FLOOD_RIVER via GloFAS discharge forecast, STORM_WIND and
//     LANDSLIDE via forecast rainfall/wind-gusts — both from Open-Meteo),
//     a forecast-adjusted score computed with the exact same
//     hazardIntensity/exposure/vulnerability blend as the live risk engine
//     (lib/riskEngine.ts), blended with the trend.
//
// Every other category gets an honestly labeled TREND_ONLY projection —
// no forward data is fabricated for hazards with no real forecast source,
// matching this project's "every figure traces to a cited source or a
// clearly labeled model baseline" approach (see README).
import { prisma } from "@/lib/prisma";
import { getRiskHistory, getSettlementRiskHistory } from "@/lib/queries";
import { DISTRICTS, findDistrict } from "@/lib/districts";
import { SETTLEMENTS } from "@/lib/settlements";
import { HAZARD_LIST, scoreToLevel, type HazardCategory, type RiskLevel } from "@/lib/hazards";
import { clamp } from "@/lib/geo";
import { densityExposureMap, elevationExposureFactor, ELEVATION_SENSITIVE_CATEGORIES } from "@/lib/riskEngine";
import type { FloodForecastDay, WeatherForecastDay } from "@/lib/sources";

const HORIZONS = [1, 3, 7] as const;
type Horizon = (typeof HORIZONS)[number];

const TYPE_EXPOSURE_BONUS: Record<string, number> = { CITY: 20, TOWN: 10, AREA: 0 };

// Categories backed by a real forward-looking public data source.
const FORECAST_BACKED_CATEGORIES = new Set<HazardCategory>(["FLOOD_RIVER", "STORM_WIND", "LANDSLIDE"]);

// Weight given to the forecast-adjusted score vs. the trend extrapolation
// for forecast-backed categories — a reasonable starting split with no
// held-out accuracy dataset to calibrate against, same category of
// judgment call as riskEngine.ts's own 0.55/0.25/0.20 weights.
const FORECAST_BLEND_WEIGHT = 0.6;

export interface ForecastRow {
  districtId: string;
  settlementId: string | null;
  category: HazardCategory;
  horizonDays: Horizon;
  predictedScore: number;
  predictedLevel: RiskLevel;
  confidence: number;
  basis: "TREND_ONLY" | "FORECAST_ENSEMBLE";
  method: string;
}

interface HistoryPoint {
  score: number;
  computedAt: string;
}

interface TrendFit {
  slope: number; // score per day
  intercept: number;
  lastDay: number; // elapsed days of the most recent sample, relative to the first
}

function fitTrend(series: HistoryPoint[]): TrendFit | null {
  if (series.length === 0) return null;
  if (series.length === 1) {
    return { slope: 0, intercept: series[0].score, lastDay: 0 };
  }
  const t0 = new Date(series[0].computedAt).getTime();
  const points = series.map((p) => ({
    x: (new Date(p.computedAt).getTime() - t0) / 86_400_000,
    y: p.score,
  }));
  const n = points.length;
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumXX = points.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept, lastDay: points[n - 1].x };
}

function trendScoreAt(fit: TrendFit | null, horizonDays: number): number {
  if (!fit) return 0;
  return clamp(fit.intercept + fit.slope * (fit.lastDay + horizonDays), 0, 100);
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// Deterministic, explainable confidence (0-100) — no black box:
// - historyDepth: more historical runs to regress on = more confidence (cap at 10 runs).
// - agreement: forecast/trend agreement (ensemble) or low recent volatility (trend-only).
// - sourceBonus: a trend-only guess is honestly capped lower than one backed
//   by a real external forecast.
function computeConfidence(opts: {
  historyLength: number;
  basis: "TREND_ONLY" | "FORECAST_ENSEMBLE";
  trendScore: number;
  forecastScore?: number;
  recentScores: number[];
}): number {
  const historyDepth = clamp(opts.historyLength / 10, 0, 1) * 40;
  const agreement =
    opts.basis === "FORECAST_ENSEMBLE" && opts.forecastScore != null
      ? 30 * (1 - clamp(Math.abs(opts.forecastScore - opts.trendScore) / 100, 0, 1))
      : 30 * (1 - clamp(stdDev(opts.recentScores) / 50, 0, 1));
  const sourceBonus = opts.basis === "FORECAST_ENSEMBLE" ? 30 : 10;
  return Math.round(clamp(historyDepth + agreement + sourceBonus, 0, 100));
}

function hazardIntensityFromDischarge(discharge: number, median: number): number {
  return clamp((discharge / median - 1) * 80, 0, 100);
}

function hazardIntensityFromWindGust(gustKmh: number): number {
  return clamp((gustKmh - 40) * 2, 0, 100);
}

function hazardIntensityFromLandslideRain(rain72hMm: number, landslideRisk: string): number {
  const slopeFactor = landslideRisk === "high" ? 1.6 : landslideRisk === "medium" ? 1.1 : 0.5;
  return clamp((rain72hMm - 40) * slopeFactor, 0, 100);
}

function toForecastRows(
  base: { districtId: string; settlementId: string | null; category: HazardCategory },
  history: HistoryPoint[],
  fit: TrendFit | null,
  forecastFor: (horizon: Horizon) => { hazardIntensity: number; sourceLabel: string } | null,
  blend: { exposure: number; vulnerability: number },
): ForecastRow[] {
  const rows: ForecastRow[] = [];
  for (const horizon of HORIZONS) {
    const trend = trendScoreAt(fit, horizon);
    let finalScore = trend;
    let basis: "TREND_ONLY" | "FORECAST_ENSEMBLE" = "TREND_ONLY";
    let method = `Linear trend over ${history.length} historical risk-score run(s).`;
    let forecastAdjusted: number | undefined;

    const forecast = forecastFor(horizon);
    if (forecast) {
      forecastAdjusted = clamp(
        forecast.hazardIntensity * 0.55 + blend.exposure * 0.25 + blend.vulnerability * 0.2,
        0,
        100,
      );
      finalScore = clamp(
        FORECAST_BLEND_WEIGHT * forecastAdjusted + (1 - FORECAST_BLEND_WEIGHT) * trend,
        0,
        100,
      );
      basis = "FORECAST_ENSEMBLE";
      method = `${Math.round(FORECAST_BLEND_WEIGHT * 100)}% ${forecast.sourceLabel} + ${Math.round((1 - FORECAST_BLEND_WEIGHT) * 100)}% trend extrapolation over ${history.length} historical run(s).`;
    }

    const confidence = computeConfidence({
      historyLength: history.length,
      basis,
      trendScore: trend,
      forecastScore: forecastAdjusted,
      recentScores: history.slice(-8).map((h) => h.score),
    });

    rows.push({
      districtId: base.districtId,
      settlementId: base.settlementId,
      category: base.category,
      horizonDays: horizon,
      predictedScore: finalScore,
      predictedLevel: scoreToLevel(finalScore),
      confidence,
      basis,
      method,
    });
  }
  return rows;
}

export async function computeAndPersistForecasts(input: {
  floodForecastByPointId: Map<string, FloodForecastDay[]>;
  weatherForecastByDistrict: Map<string, WeatherForecastDay[]>;
}): Promise<ForecastRow[]> {
  const exposureMap = densityExposureMap();
  const elevationRows = await prisma.district.findMany({ select: { id: true, elevation: true } });
  const elevationMap = new Map(elevationRows.map((d) => [d.id, d.elevation]));

  const historyEntries = await Promise.all(
    DISTRICTS.flatMap((district) =>
      HAZARD_LIST.map(async (meta) => ({
        district,
        category: meta.category,
        history: await getRiskHistory(district.id, meta.category, 30),
      })),
    ),
  );

  const rows: ForecastRow[] = [];

  for (const { district, category, history } of historyEntries) {
    if (history.length === 0) continue;
    const fit = fitTrend(history);

    let exposure = exposureMap.get(district.id) ?? 50;
    if (ELEVATION_SENSITIVE_CATEGORIES.has(category)) {
      exposure = clamp(exposure * elevationExposureFactor(elevationMap.get(district.id)), 0, 100);
    }
    const vulnerability = district.vulnerabilityIndex * 100;

    const forecastFor = (horizon: Horizon) => {
      if (category === "FLOOD_RIVER") {
        const day = (input.floodForecastByPointId.get(district.id) ?? []).find((d) => d.dayOffset === horizon);
        if (!day) return null;
        return {
          hazardIntensity: hazardIntensityFromDischarge(day.discharge, day.median),
          sourceLabel: "GloFAS river-discharge forecast (Open-Meteo Flood API)",
        };
      }
      if (category === "STORM_WIND") {
        const day = (input.weatherForecastByDistrict.get(district.id) ?? []).find((d) => d.dayOffset === horizon);
        if (!day) return null;
        return {
          hazardIntensity: hazardIntensityFromWindGust(day.windGustKmh),
          sourceLabel: "wind-gust forecast (Open-Meteo Forecast API)",
        };
      }
      if (category === "LANDSLIDE") {
        const day = (input.weatherForecastByDistrict.get(district.id) ?? []).find((d) => d.dayOffset === horizon);
        if (!day) return null;
        return {
          hazardIntensity: hazardIntensityFromLandslideRain(day.precipitationMm, district.landslideRisk),
          sourceLabel: "rainfall forecast (Open-Meteo Forecast API)",
        };
      }
      return null;
    };

    rows.push(
      ...toForecastRows(
        { districtId: district.id, settlementId: null, category },
        history,
        fit,
        FORECAST_BACKED_CATEGORIES.has(category) ? forecastFor : () => null,
        { exposure, vulnerability },
      ),
    );
  }

  if (rows.length > 0) await prisma.riskForecast.createMany({ data: rows });
  return rows;
}

const SETTLEMENT_FORECAST_CATEGORIES: HazardCategory[] = ["FLOOD_RIVER", "FLOOD_COASTAL", "DROUGHT"];

// Deliberately does not issue new per-settlement API calls (386 settlements
// x extra forecast requests would be wasteful) — reuses the already-fetched
// district-level GloFAS discharge-ratio forecast, scaled to the settlement's
// own exposure, mirroring lib/settlementRiskEngine.ts's existing "drought is
// inherited from the parent district" honesty pattern.
export async function computeAndPersistSettlementForecasts(input: {
  floodForecastByPointId: Map<string, FloodForecastDay[]>;
}): Promise<ForecastRow[]> {
  const historyEntries = await Promise.all(
    SETTLEMENTS.flatMap((settlement) =>
      SETTLEMENT_FORECAST_CATEGORIES.map(async (category) => ({
        settlement,
        category,
        history: await getSettlementRiskHistory(settlement.id, category, 30),
      })),
    ),
  );

  const rows: ForecastRow[] = [];

  for (const { settlement, category, history } of historyEntries) {
    if (history.length === 0) continue;
    const district = findDistrict(settlement.districtId);
    if (!district) continue;
    if (category === "FLOOD_COASTAL" && !district.coastal) continue;

    const fit = fitTrend(history);
    const vulnerability = district.vulnerabilityIndex * 100;
    const exposure = 50 + TYPE_EXPOSURE_BONUS[settlement.type];

    const forecastFor = (horizon: Horizon) => {
      if (category !== "FLOOD_RIVER") return null;
      const day = (input.floodForecastByPointId.get(settlement.districtId) ?? []).find(
        (d) => d.dayOffset === horizon,
      );
      if (!day) return null;
      return {
        hazardIntensity: hazardIntensityFromDischarge(day.discharge, day.median),
        sourceLabel: `regional (district-level) GloFAS river-discharge forecast, scaled to ${settlement.name}'s exposure`,
      };
    };

    rows.push(
      ...toForecastRows(
        { districtId: settlement.districtId, settlementId: settlement.id, category },
        history,
        fit,
        forecastFor,
        { exposure, vulnerability },
      ),
    );
  }

  if (rows.length > 0) await prisma.riskForecast.createMany({ data: rows });
  return rows;
}
