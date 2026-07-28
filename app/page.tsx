import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLatestRiskScores, getRisingRiskWatchlist } from "@/lib/queries";
import { RefreshButton } from "@/components/RefreshButton";
import { AutoRefresh } from "@/components/AutoRefresh";
import { MapLoader } from "@/components/MapLoader";
import { AlertList } from "@/components/AlertList";
import { RisingRiskWatchlist } from "@/components/RisingRiskWatchlist";
import { StatCard } from "@/components/StatCard";
import { RiskBarChart } from "@/components/charts/RiskBarChart";
import { SeverityDonut } from "@/components/charts/SeverityDonut";
import { DistrictGridWithDrawer } from "@/components/DistrictGridWithDrawer";
import { DOMAIN_LABELS, HAZARD_LIST, scoreToLevel, type RiskLevel } from "@/lib/hazards";
import type { DistrictWithRisk } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const [districts, riskScores, alerts, lastRun, settlementCount, recentDisasters, risingRisk] = await Promise.all([
    prisma.district.findMany({ orderBy: { name: "asc" } }),
    getLatestRiskScores(),
    prisma.alert.findMany({
      where: { active: true },
      orderBy: { issuedAt: "desc" },
      include: { district: true, settlement: true },
    }),
    prisma.ingestionRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.settlement.count(),
    prisma.historicalDisaster.findMany({ orderBy: { date: "desc" }, take: 4, include: { district: true } }),
    getRisingRiskWatchlist(),
  ]);

  const byDistrict = new Map<string, typeof riskScores>();
  for (const r of riskScores) {
    const list = byDistrict.get(r.districtId) ?? [];
    list.push(r);
    byDistrict.set(r.districtId, list);
  }

  const enriched: DistrictWithRisk[] = districts.map((d) => {
    const scores = byDistrict.get(d.id) ?? [];
    const overall = scores.length > 0 ? scores.reduce((a, b) => a + b.score, 0) / scores.length : 0;
    return {
      ...d,
      landslideRisk: d.landslideRisk,
      primaryCrops: JSON.parse(d.primaryCrops),
      overallRisk: Math.round(overall * 10) / 10,
      riskScores: scores,
    };
  });

  const SEVERITY_RANK: Record<string, number> = { RED: 3, ORANGE: 2, YELLOW: 1, GREEN: 0 };
  alerts.sort((a, b) => SEVERITY_RANK[b.level] - SEVERITY_RANK[a.level]);

  return {
    districts: enriched,
    alerts,
    lastRun,
    hasData: riskScores.length > 0,
    settlementCount,
    recentDisasters,
    risingRisk: risingRisk.slice(0, 8),
  };
}

export default async function DashboardPage() {
  const { districts, alerts, lastRun, hasData, settlementCount, recentDisasters, risingRisk } =
    await getDashboardData();
  const sorted = [...districts].sort((a, b) => b.overallRisk - a.overallRisk);
  const domains = ["land", "ocean", "air", "biological"] as const;

  const severityCounts: Record<RiskLevel, number> = { RED: 0, ORANGE: 0, YELLOW: 0, GREEN: 0 };
  for (const d of districts) severityCounts[scoreToLevel(d.overallRisk)]++;

  const criticalCount = alerts.filter((a) => a.level === "RED").length;
  const highestRisk = sorted[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
      <AutoRefresh />
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Sierra Leone Multi-Hazard Dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Live composite risk across 16 districts and {settlementCount} cities, towns &amp; areas — 13
            hazard categories spanning land, ocean, air and biological domains.
          </p>
          <p className="mt-2 text-xs text-muted">
            {lastRun
              ? `Last data pull: ${new Date(lastRun.startedAt).toLocaleString()}`
              : "No data yet — click Refresh live data to run the first ingestion."}
          </p>
        </div>
        <RefreshButton />
      </section>

      {!hasData && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          No risk scores yet. Click <strong>Refresh live data</strong> above to pull from USGS, GDACS,
          Open-Meteo and run the risk engine for the first time.
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Active alerts"
          value={alerts.length}
          hint={`${criticalCount} critical`}
          icon="🚨"
          accent="var(--status-critical)"
        />
        <StatCard label="Districts monitored" value={districts.length} icon={"\u{1F4CD}"} accent="var(--brand-primary)" />
        <StatCard label="Cities/towns/areas" value={settlementCount} icon={"\u{1F3D8}\u{FE0F}"} accent="var(--brand-teal)" />
        <StatCard
          label="Highest risk"
          value={highestRisk ? Math.round(highestRisk.overallRisk) : "—"}
          hint={highestRisk?.name}
          icon={"\u{1F4C8}"}
          accent="var(--status-serious)"
        />
        <StatCard
          label="Hazard categories"
          value={HAZARD_LIST.length}
          hint="Land · Ocean · Air · Biological"
          icon={"\u{1F30D}"}
          accent="var(--status-good)"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="h-105 overflow-hidden rounded-xl surface-card">
          <MapLoader districts={districts} />
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Active Alerts (Warning / Critical)
          </h2>
          <div className="max-h-105 overflow-y-auto pr-1">
            <AlertList alerts={alerts} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl p-5 surface-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            District risk status
          </h2>
          <SeverityDonut counts={severityCounts} />
        </div>
        <div className="rounded-xl p-5 surface-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Top 8 districts by composite risk
          </h2>
          <RiskBarChart
            items={sorted.slice(0, 8).map((d) => ({
              id: d.id,
              label: d.name,
              score: d.overallRisk,
              href: `/districts/${d.id}`,
            }))}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">⚠️ Rising Risk Watch (next 3–7 days)</h2>
        <p className="mb-3 text-xs text-muted">
          Places currently Safe/Caution whose predicted trajectory (statistical trend + real forecast
          data) crosses into Warning/Critical — see a place&apos;s Trend column for the full projection.
        </p>
        <RisingRiskWatchlist entries={risingRisk} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Districts by Overall Risk</h2>
          <span className="text-xs text-muted">{districts.length} districts · click 👁 for quick view</span>
        </div>
        <DistrictGridWithDrawer districts={sorted} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <Link href="/history" className="text-sm" style={{ color: "var(--brand-teal)" }}>
              Full timeline →
            </Link>
          </div>
          <ul className="space-y-2">
            {recentDisasters.map((d) => {
              const meta = HAZARD_LIST.find((h) => h.category === d.category);
              return (
                <li key={d.id} className="flex items-start gap-3 rounded-lg p-3 text-sm surface-card">
                  <span className="text-lg">{meta?.icon}</span>
                  <div>
                    <p className="font-medium">{d.title}</p>
                    <p className="text-xs text-muted">
                      {new Date(d.date).toLocaleDateString()} {d.district ? `· ${d.district.name}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">Hazard Categories Monitored</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {domains.map((domain) => (
              <div key={domain} className="rounded-xl p-3 text-sm surface-card">
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  {DOMAIN_LABELS[domain]}
                </h3>
                <ul className="space-y-1">
                  {HAZARD_LIST.filter((h) => h.domain === domain).map((h) => (
                    <li key={h.category} className="flex items-center gap-1.5">
                      <span>{h.icon}</span>
                      <span>{h.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
