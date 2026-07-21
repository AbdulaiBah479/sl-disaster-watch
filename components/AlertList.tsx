import Link from "next/link";
import { RiskBadge } from "@/components/RiskBadge";
import { HAZARDS } from "@/lib/hazards";
import type { RiskLevel } from "@/lib/hazards";

interface AlertItem {
  id: string;
  districtId: string;
  settlementId?: string | null;
  category: keyof typeof HAZARDS;
  level: RiskLevel;
  title: string;
  message: string;
  issuedAt: string | Date;
  district: { name: string };
  settlement?: { name: string } | null;
}

export function AlertList({ alerts }: { alerts: AlertItem[] }) {
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
                <span className="text-xs text-muted">{new Date(a.issuedAt).toLocaleString()}</span>
              </div>
              <p className="mt-0.5 text-sm text-muted">{a.message}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
