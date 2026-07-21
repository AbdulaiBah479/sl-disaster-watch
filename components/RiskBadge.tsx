import { RISK_LEVEL_META, type RiskLevel } from "@/lib/hazards";

// Color never carries the level alone: every chip pairs the status color
// with a text label (and usually an icon from the caller), per the status
// palette's documented relief rule for sub-3:1 swatches.
export function RiskBadge({
  level,
  score,
  size = "md",
}: {
  level: RiskLevel;
  score?: number;
  size?: "sm" | "md";
}) {
  const meta = RISK_LEVEL_META[level];
  const padding = size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${padding}`}
      style={{ backgroundColor: meta.color, color: meta.textColor }}
    >
      {meta.label}
      {typeof score === "number" && (
        <span className="opacity-80">{Math.round(score)}</span>
      )}
    </span>
  );
}
