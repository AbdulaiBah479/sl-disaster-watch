import Link from "next/link";
import { RiskBadge } from "@/components/RiskBadge";
import { HAZARDS } from "@/lib/hazards";
import type { RiskLevel } from "@/lib/hazards";
import { formatDateTime } from "@/lib/format";

interface AlertItem {
  id: string;
  districtId: string;
  settlementId?: string | null;
  category: keyof typeof HAZARDS;
  level: RiskLevel;
  title: string;
  message: string;
  issuedAt: string | Date;
  official?: boolean;
  district: { name: string };
  settlement?: { name: string } | null;
}

// `onToggleOfficial` is only ever passed from a Client Component ancestor
// (see app/alerts/page.tsx) — this module has no "use client" of its own so
// it also renders fine as pure server output on the dashboard (app/page.tsx),
// where the moderation button simply doesn't render.
export function AlertList({
  alerts,
  onToggleOfficial,
  canModerate,
}: {
  alerts: AlertItem[];
  onToggleOfficial?: (id: string, official: boolean) => void;
  canModerate?: (a: AlertItem) => boolean;
}) {
  if (alerts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted" style={{ borderColor: "var(--border-strong)" }}>
        No active Warning/Critical alerts right now — all monitored areas are within Safe/Caution thresholds.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {alerts.map((a) => {
        const href = a.settlementId
          ? `/districts/${a.districtId}/settlements/${a.settlementId}`
          : `/districts/${a.districtId}`;
        const place = a.settlement ? `${a.settlement.name}, ${a.district.name}` : a.district.name;
        return (
          <li key={a.id} className="flex items-start gap-3 rounded-lg p-3 surface-card">
            <span className="mt-0.5 text-lg">{HAZARDS[a.category]?.icon}</span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <RiskBadge level={a.level} size="sm" />
                <Link href={href} className="font-medium hover:underline">
                  {place}
                </Link>
                <span className="text-xs text-muted">{formatDateTime(a.issuedAt)}</span>
                {a.official && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: "var(--status-good)22", color: "var(--status-good)" }}
                  >
                    ✓ Agency Verified
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted">{a.message}</p>
            </div>
            {onToggleOfficial && (canModerate ? canModerate(a) : true) && (
              <button
                onClick={() => onToggleOfficial(a.id, !a.official)}
                className="shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium"
                style={{ borderColor: "var(--border-strong)" }}
              >
                {a.official ? "Unverify" : "Mark official"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
