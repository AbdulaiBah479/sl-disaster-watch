import Link from "next/link";
import { RiskBadge } from "@/components/RiskBadge";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { HAZARDS } from "@/lib/hazards";
import type { RisingRiskEntry } from "@/lib/queries";

export function RisingRiskWatchlist({ entries }: { entries: RisingRiskEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted" style={{ borderColor: "var(--border-strong)" }}>
        No places are predicted to escalate into Warning/Critical over the next 7 days right now.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((e, i) => {
        const href = e.settlementId
          ? `/districts/${e.districtId}/settlements/${e.settlementId}`
          : `/districts/${e.districtId}`;
        const place = e.settlementName ? `${e.settlementName}, ${e.districtName}` : e.districtName;
        return (
          <li key={`${e.districtId}-${e.settlementId ?? ""}-${e.category}-${e.horizonDays}-${i}`} className="rounded-lg p-3 surface-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg">{HAZARDS[e.category]?.icon}</span>
              <Link href={href} className="font-medium hover:underline">
                {place}
              </Link>
              <RiskBadge level={e.currentLevel} score={e.currentScore} size="sm" />
              <span className="text-muted">→</span>
              <RiskBadge level={e.predictedLevel} score={e.predictedScore} size="sm" />
              <span className="text-xs text-muted">in {e.horizonDays}d</span>
            </div>
            <div className="mt-1.5">
              <ConfidenceBadge confidence={e.confidence} basis={e.basis} method={e.method} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
