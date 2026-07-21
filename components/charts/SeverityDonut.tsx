import { RISK_LEVEL_META, type RiskLevel } from "@/lib/hazards";

const ORDER: RiskLevel[] = ["RED", "ORANGE", "YELLOW", "GREEN"];

// Status breakdown donut — one segment per fixed status level, always in
// the same order/color, with counts as direct labels in the legend (never
// color alone, per the accessibility rule for status encodings).
export function SeverityDonut({ counts }: { counts: Record<RiskLevel, number> }) {
  const total = ORDER.reduce((a, k) => a + counts[k], 0) || 1;
  const size = 120;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  const segments = ORDER.reduce<{ level: RiskLevel; dash: number; gap: number; offset: number }[]>(
    (acc, level) => {
      const frac = counts[level] / total;
      const dash = frac * circumference;
      const prevOffset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
      acc.push({ level, dash, gap: circumference - dash, offset: prevOffset });
      return acc;
    },
    [],
  );

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        {segments.map((s) =>
          s.dash > 0 ? (
            <circle
              key={s.level}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={RISK_LEVEL_META[s.level].color}
              strokeWidth={stroke}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={-s.offset}
              strokeLinecap="butt"
            />
          ) : null,
        )}
      </svg>
      <ul className="space-y-1.5 text-sm">
        {ORDER.map((level) => (
          <li key={level} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: RISK_LEVEL_META[level].color }} />
            <span className="text-muted">{RISK_LEVEL_META[level].label}</span>
            <span className="font-semibold tabular-nums">{counts[level]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
