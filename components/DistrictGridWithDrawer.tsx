"use client";

import { useState } from "react";
import Link from "next/link";
import { DistrictCard } from "@/components/DistrictCard";
import { RiskBadge } from "@/components/RiskBadge";
import { Drawer } from "@/components/Drawer";
import { SatelliteSnapshot } from "@/components/SatelliteSnapshot";
import { HAZARD_LIST, scoreToLevel } from "@/lib/hazards";
import { HAZARD_GUIDANCE } from "@/lib/recommendations";
import type { DistrictWithRisk } from "@/lib/types";
import { formatNumber } from "@/lib/format";

export function DistrictGridWithDrawer({ districts }: { districts: DistrictWithRisk[] }) {
  const [active, setActive] = useState<DistrictWithRisk | null>(null);
  const topScores = active
    ? [...active.riskScores].sort((a, b) => b.score - a.score).slice(0, 4)
    : [];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {districts.map((d) => (
          <DistrictCard key={d.id} district={d} onQuickView={setActive} />
        ))}
      </div>

      <Drawer
        open={active != null}
        onClose={() => setActive(null)}
        title={active?.name ?? ""}
        subtitle={active ? `${active.province} · pop. ${formatNumber(active.population)}` : undefined}
      >
        {active && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Overall risk</span>
              <RiskBadge level={scoreToLevel(active.overallRisk)} score={active.overallRisk} />
            </div>

            <SatelliteSnapshot label={active.name} lat={active.lat} lon={active.lon} bboxDegrees={0.35} />

            <div className="space-y-3">
              {topScores.map((r) => {
                const meta = HAZARD_LIST.find((h) => h.category === r.category)!;
                const guidance = HAZARD_GUIDANCE[r.category];
                return (
                  <div key={r.category} className="rounded-lg p-3 surface-card">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {meta.icon} {meta.label}
                      </span>
                      <RiskBadge level={r.level} score={r.score} size="sm" />
                    </div>
                    <p className="mt-1 text-xs text-muted">{r.drivers.notes?.[0]}</p>
                    <p className="mt-2 text-xs">
                      <span className="font-semibold">Cause: </span>
                      <span className="text-muted">{guidance.cause}</span>
                    </p>
                  </div>
                );
              })}
            </div>

            <Link
              href={`/districts/${active.id}`}
              className="block rounded-lg py-2.5 text-center text-sm font-medium text-white"
              style={{ background: "var(--brand-primary)" }}
            >
              View full breakdown & all settlements →
            </Link>
          </div>
        )}
      </Drawer>
    </>
  );
}
