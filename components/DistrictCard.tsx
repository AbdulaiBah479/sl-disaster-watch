import Link from "next/link";
import { RiskBadge } from "@/components/RiskBadge";
import { HAZARDS, scoreToLevel } from "@/lib/hazards";
import type { DistrictWithRisk } from "@/lib/types";

export function DistrictCard({
  district,
  onQuickView,
}: {
  district: DistrictWithRisk;
  onQuickView?: (district: DistrictWithRisk) => void;
}) {
  const top = [...district.riskScores].sort((a, b) => b.score - a.score).slice(0, 3);
  const level = scoreToLevel(district.overallRisk);

  return (
    <div className="group relative rounded-xl p-4 shadow-sm transition hover:shadow-md surface-card">
      <Link href={`/districts/${district.id}`} className="block">
        <div className="flex items-start justify-between gap-2 pr-6">
          <div>
            <p className="font-semibold">{district.name}</p>
            <p className="text-xs text-muted">{district.province}</p>
          </div>
          <RiskBadge level={level} score={district.overallRisk} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {top.map((r) => (
            <span
              key={r.category}
              className="inline-flex items-center gap-1 rounded-md bg-black/5 px-1.5 py-0.5 text-[11px] text-muted dark:bg-white/10"
              title={HAZARDS[r.category].label}
            >
              {HAZARDS[r.category].icon} {HAZARDS[r.category].label}
            </span>
          ))}
        </div>
      </Link>
      {onQuickView && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onQuickView(district);
          }}
          aria-label={`Quick view ${district.name}`}
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-xs opacity-0 transition hover:bg-black/5 group-hover:opacity-100 dark:hover:bg-white/10"
        >
          👁
        </button>
      )}
    </div>
  );
}
