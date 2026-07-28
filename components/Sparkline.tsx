// Minimal single-series trend line. No axes/legend/grid for a single series
// per the mark spec — a thin 2px line, current-value dot colored by status.
// An optional dashed tail projects the predictive engine's forecast
// (lib/predictionEngine.ts) beyond the real history, colored by the
// *predicted* level so an escalating trajectory is visible at a glance.
import { RISK_LEVEL_META, type RiskLevel } from "@/lib/hazards";

export function Sparkline({
  series,
  level,
  forecast,
  width = 120,
  height = 32,
}: {
  series: { score: number }[];
  level: RiskLevel;
  forecast?: { horizonDays: number; score: number; level: RiskLevel }[];
  width?: number;
  height?: number;
}) {
  if (series.length < 2) {
    return <div style={{ width, height }} className="flex items-center text-[11px] text-stone-400">Not enough history yet</div>;
  }

  const historyValues = series.map((s) => s.score);
  const forecastPoints = [...(forecast ?? [])].sort((a, b) => a.horizonDays - b.horizonDays);
  const allValues = [...historyValues, ...forecastPoints.map((f) => f.score)];
  const min = Math.min(...allValues, 0);
  const max = Math.max(...allValues, 100);
  const range = max - min || 1;
  const stepX = width / (historyValues.length - 1);
  const totalWidth = width + forecastPoints.length * stepX;

  const toY = (v: number) => height - ((v - min) / range) * height;

  const historyPoints = historyValues.map((v, i) => `${i * stepX},${toY(v)}`);
  const lastHistoryY = toY(historyValues[historyValues.length - 1]);

  const forecastLinePoints = [
    `${width},${lastHistoryY}`,
    ...forecastPoints.map((f, i) => `${width + (i + 1) * stepX},${toY(f.score)}`),
  ];

  const color = RISK_LEVEL_META[level].color;
  const lastForecast = forecastPoints[forecastPoints.length - 1];
  const forecastColor = lastForecast ? RISK_LEVEL_META[lastForecast.level].color : color;

  return (
    <svg width={totalWidth} height={height} className="overflow-visible">
      <polyline
        points={historyPoints.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-stone-400 dark:text-stone-600"
      />
      <circle cx={width} cy={lastHistoryY} r={4} fill={color} />
      {forecastPoints.length > 0 && (
        <>
          <polyline
            points={forecastLinePoints.join(" ")}
            fill="none"
            stroke={forecastColor}
            strokeWidth={2}
            strokeDasharray="4 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={width + forecastPoints.length * stepX}
            cy={toY(lastForecast.score)}
            r={4}
            fill={forecastColor}
            stroke="white"
            strokeWidth={1}
          />
        </>
      )}
    </svg>
  );
}
