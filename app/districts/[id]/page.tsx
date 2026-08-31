import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLatestRiskScores, getRiskHistory, getLatestSettlementRiskScores, getLatestForecasts } from "@/lib/queries";
import { RiskBadge } from "@/components/RiskBadge";
import { Sparkline } from "@/components/Sparkline";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SatelliteSnapshot } from "@/components/SatelliteSnapshot";
import { AutoRefresh } from "@/components/AutoRefresh";
import { HAZARD_GUIDANCE, guidanceIntro } from "@/lib/recommendations";
import { SETTLEMENT_TYPE_LABELS, type SettlementType } from "@/lib/settlements";
import { HAZARD_LIST, scoreToLevel, type HazardCategory } from "@/lib/hazards";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DistrictPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const district = await prisma.district.findUnique({ where: { id } });
  if (!district) notFound();

  const [allLatest, disasters, reports, settlements, settlementScores, forecasts] = await Promise.all([
    getLatestRiskScores(),
    prisma.historicalDisaster.findMany({ where: { districtId: id }, orderBy: { date: "desc" } }),
    prisma.citizenReport.findMany({ where: { districtId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.settlement.findMany({ where: { districtId: id }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
    getLatestSettlementRiskScores(),
    getLatestForecasts({ districtId: id }),
  ]);

  const forecastByCategory = new Map<HazardCategory, typeof forecasts>();
  for (const f of forecasts) {
    const list = forecastByCategory.get(f.category) ?? [];
    list.push(f);
    forecastByCategory.set(f.category, list);
  }

  const riskScores = allLatest.filter((r) => r.districtId === id);
  const overall =
    riskScores.length > 0
      ? riskScores.reduce((a, b) => a + b.score, 0) / riskScores.length
      : 0;

  const histories = await Promise.all(
    HAZARD_LIST.map(async (h) => ({
      category: h.category,
      series: await getRiskHistory(id, h.category as HazardCategory, 20),
    })),
  );
  const historyMap = new Map(histories.map((h) => [h.category, h.series]));

  const sortedScores = [...riskScores].sort((a, b) => b.score - a.score);

  const settlementOverall = new Map<string, number>();
  for (const s of settlements) {
    const scores = settlementScores.filter((r) => r.settlementId === s.id);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b.score, 0) / scores.length : 0;
    settlementOverall.set(s.id, avg);
  }
  const settlementsByType = (t: SettlementType) => settlements.filter((s) => s.type === t);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      <AutoRefresh />
      <Breadcrumbs items={[{ label: "Dashboard", href: "/" }, { label: district.name }]} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{district.name}</h1>
          <p className="text-sm text-muted">
            {district.province} Province · Capital: {district.capital} · Population{" "}
            {formatNumber(district.population)} · {formatNumber(district.areaKm2)} km²
            {district.elevation != null ? ` · ~${Math.round(district.elevation)} m elevation` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted">
            {district.coastal && <span className="rounded px-1.5 py-0.5 surface-card">Coastal</span>}
            {district.riverine && <span className="rounded px-1.5 py-0.5 surface-card">Riverine</span>}
            <span className="rounded px-1.5 py-0.5 surface-card">
              Landslide susceptibility: {district.landslideRisk}
            </span>
          </div>
        </div>
        <RiskBadge level={scoreToLevel(overall)} score={overall} />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Hazard Breakdown</h2>
        <div className="overflow-hidden rounded-xl surface-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Hazard</th>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2">Trend</th>
                <th className="px-3 py-2">Drivers</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {sortedScores.map((r) => {
                const meta = HAZARD_LIST.find((h) => h.category === r.category)!;
                const guidance = HAZARD_GUIDANCE[r.category];
                const series = historyMap.get(r.category) ?? [];
                const categoryForecasts = forecastByCategory.get(r.category) ?? [];
                const badgeForecast = categoryForecasts.find((f) => f.horizonDays === 3) ?? categoryForecasts[0];
                return (
                  <tr key={r.category}>
                    <td className="px-3 py-2 align-top">
                      <span className="mr-1">{meta.icon}</span>
                      {meta.label}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <RiskBadge level={r.level} score={r.score} size="sm" />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Sparkline
                        series={series}
                        level={r.level}
                        forecast={categoryForecasts.map((f) => ({
                          horizonDays: f.horizonDays,
                          score: f.predictedScore,
                          level: f.predictedLevel,
                        }))}
                      />
                      {badgeForecast && (
                        <div className="mt-1">
                          <ConfidenceBadge
                            confidence={badgeForecast.confidence}
                            basis={badgeForecast.basis}
                            method={badgeForecast.method}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-xs">
                      <p className="text-muted">{r.drivers.notes?.[0]}</p>
                      <details className="mt-1">
                        <summary className="cursor-pointer font-medium" style={{ color: "var(--brand-teal)" }}>
                          Cause &amp; recommended action
                        </summary>
                        <div className="mt-1.5 space-y-1.5 text-muted">
                          <p>{guidance.cause}</p>
                          <p className="font-medium text-foreground">{guidanceIntro(r.level)}</p>
                          <ul className="list-disc space-y-0.5 pl-4">
                            {guidance.recommendations.slice(0, 3).map((rec, i) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                          <p className="text-[11px]">
                            Coordinating bodies: {guidance.responsibleBodies.join(", ")} —{" "}
                            <Link href="/agencies" className="underline" style={{ color: "var(--brand-teal)" }}>
                              full directory
                            </Link>
                          </p>
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
              {sortedScores.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted">
                    No risk data yet — run a data refresh from the dashboard.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Satellite Snapshot</h2>
        <div className="max-w-md rounded-xl p-4 surface-card">
          <SatelliteSnapshot label={district.name} lat={district.lat} lon={district.lon} bboxDegrees={0.35} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Cities, Towns &amp; Areas</h2>
        <p className="mb-3 text-xs text-muted">
          Flood and drought risk computed independently for each place below — click through for its own
          breakdown.
        </p>
        {(["CITY", "TOWN", "AREA"] as SettlementType[]).map((type) => {
          const list = settlementsByType(type);
          if (list.length === 0) return null;
          return (
            <div key={type} className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {SETTLEMENT_TYPE_LABELS[type]} ({list.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {list.map((s) => {
                  const score = settlementOverall.get(s.id) ?? 0;
                  const level = scoreToLevel(score);
                  return (
                    <Link
                      key={s.id}
                      href={`/districts/${district.id}/settlements/${s.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs surface-card"
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: `var(--status-${level === "RED" ? "critical" : level === "ORANGE" ? "serious" : level === "YELLOW" ? "warning" : "good"})` }} />
                      {s.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
        {settlements.length === 0 && <p className="text-sm text-muted">No settlement data for this district yet.</p>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Documented Historical Disasters</h2>
        {disasters.length === 0 ? (
          <p className="text-sm text-muted">No specific documented events for this district in the archive.</p>
        ) : (
          <ul className="space-y-2">
            {disasters.map((d) => (
              <li key={d.id} className="rounded-lg p-3 text-sm surface-card">
                <p className="font-medium">
                  {d.title} <span className="font-normal text-muted">— {formatDate(d.date)}</span>
                </p>
                <p className="mt-1 text-muted">{d.description}</p>
                {(d.deaths || d.affected) && (
                  <p className="mt-1 text-xs text-muted">
                    {d.deaths ? `${formatNumber(d.deaths)} deaths` : ""}
                    {d.deaths && d.affected ? " · " : ""}
                    {d.affected ? `${formatNumber(d.affected)} affected` : ""}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted">Source: {d.source}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Community Reports</h2>
          <Link href={`/report?district=${district.id}`} className="text-sm" style={{ color: "var(--brand-teal)" }}>
            + Report an incident here
          </Link>
        </div>
        {reports.length === 0 ? (
          <p className="text-sm text-muted">No community reports submitted yet.</p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-lg p-3 text-sm surface-card">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{HAZARD_LIST.find((h) => h.category === r.category)?.label}</span>
                  <span className="text-xs text-muted">{formatDateTime(r.createdAt)}</span>
                </div>
                <p className="mt-1 text-muted">{r.description}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted">{r.status}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
