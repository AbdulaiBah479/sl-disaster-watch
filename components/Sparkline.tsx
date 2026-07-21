// Minimal single-series trend line. No axes/legend/grid for a single series
// per the mark spec — a thin 2px line, current-value dot colored by status.
import { RISK_LEVEL_META, type RiskLevel } from "@/lib/hazards";

export function Sparkline({
  series,
  level,
  width = 120,
  height = 32,
}: {
  series: { score: number }[];
  level: RiskLevel;
  width?: number;
  height?: number;
}) {
  if (series.length < 2) {
    return <div style={{ width, height }} className="flex items-center text-[11px] text-stone-400">Not enough history yet</div>;
  }

  const values = series.map((s) => s.score);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  const last = values[values.length - 1];
  const lastY = height - ((last - min) / range) * height;
  const color = RISK_LEVEL_META[level].color;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-stone-400 dark:text-stone-600"
      />
      <circle cx={width} cy={lastY} r={4} fill={color} />
    </svg>
  );
}
