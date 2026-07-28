import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLatestRiskScores, getSettlementRiskHistory, getLatestForecasts } from "@/lib/queries";
import { RiskBadge } from "@/components/RiskBadge";
import { Sparkline } from "@/components/Sparkline";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SatelliteSnapshot } from "@/components/SatelliteSnapshot";
import { AutoRefresh } from "@/components/AutoRefresh";
import { HAZARD_GUIDANCE, guidanceIntro } from "@/lib/recommendations";
import { SETTLEMENT_TYPE_LABELS, type SettlementType } from "@/lib/settlements";
import { HAZARD_LIST, scoreToLevel, type HazardCategory, type RiskLevel } from "@/lib/hazards";

export const dynamic = "force-dynamic";

const FOCUS_CATEGORIES: HazardCategory[] = ["FLOOD_RIVER", "FLOOD_COASTAL", "DROUGHT"];

export default async function SettlementPage({
  params,
}: {
  params: Promise<{ id: string; settlementId: string }>;
}) {
  const { id, settlementId } = await params;

  const settlement = await prisma.settlement.findUnique({
    where: { id: settlementId },
    include: { district: true },
  });
  if (!settlement || settlement.districtId !== id) notFound();

  const [ownScores, districtLatest, reports, forecasts] = await Promise.all([
    prisma.settlementRiskScore.findMany({
      where: { settlementId },
      orderBy: { computedAt: "desc" },
    }),
    getLatestRiskScores(),
    prisma.citizenReport.findMany({
      where: { settlementId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getLatestForecasts({ settlementId }),
  ]);

  const forecastByCategory = new Map<HazardCategory, typeof forecasts>();
  for (const f of forecasts) {
    const list = forecastByCategory.get(f.category) ?? [];
    list.push(f);
    forecastByCategory.set(f.category, list);
  }

  const seen = new Set<string>();
  const latestOwn = ownScores.filter((r) => {
    if (seen.has(r.category)) return false;
    seen.add(r.category);
    return true;
  });

  const inherited = getLatestRiskScoresFor(districtLatest, settlement.districtId).filter(
    (r) => !FOCUS_CATEGORIES.includes(r.category),
  );

  const overall =
    latestOwn.length > 0 ? latestOwn.reduce((a, b) => a + b.score, 0) / latestOwn.length : 0;

  const histories = await Promise.all(
    FOCUS_CATEGORIES.map(async (c) => ({ category: c, series: await getSettlementRiskHistory(settlementId, c, 20) })),
  );
  const historyMap = new Map(histories.map((h) => [h.category, h.series]));

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      <AutoRefresh />
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: settlement.district.name, href: `/districts/${settlement.districtId}` },
          { label: settlement.name },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{settlement.name}</h1>
          <p className="text-sm text-muted">
            {SETTLEMENT_TYPE_LABELS[settlement.type as SettlementType]} in {settlement.district.name},{" "}
            {settlement.district.province} Province
            {settlement.population ? ` · pop. ${settlement.population.toLocaleString()}` : ""}
            {settlement.elevation != null ? ` · ~${Math.round(settlement.elevation)} m elevation` : ""}
          </p>
        </div>
        <RiskBadge level={scoreToLevel(overall)} score={overall} />
      </div>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Flood &amp; Drought Risk (place-specific)</h2>
        <p className="mb-3 text-xs text-muted">
          Computed directly for {settlement.name}&apos;s own coordinates — live rainfall, river discharge and
          drought signal, not just inherited from the district.
        </p>
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
              {latestOwn.map((r) => {
                const category = r.category as HazardCategory;
                const level = r.level as RiskLevel;
                const meta = HAZARD_LIST.find((h) => h.category === category)!;
                const guidance = HAZARD_GUIDANCE[category];
                const drivers = JSON.parse(r.drivers) as { notes: string[] };
                const series = historyMap.get(category) ?? [];
                const categoryForecasts = forecastByCategory.get(category) ?? [];
                const badgeForecast = categoryForecasts.find((f) => f.horizonDays === 3) ?? categoryForecasts[0];
                return (
                  <tr key={category}>
                    <td className="px-3 py-2 align-top">
                      <span className="mr-1">{meta.icon}</span>
                      {meta.label}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <RiskBadge level={level} score={r.score} size="sm" />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Sparkline
                        series={series}
                        level={level}
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
                      <p className="text-muted">{drivers.notes?.[0]}</p>
                      <details className="mt-1">
                        <summary className="cursor-pointer font-medium" style={{ color: "var(--brand-teal)" }}>
                          Cause &amp; recommended action
                        </summary>
                        <div className="mt-1.5 space-y-1.5 text-muted">
                          <p>{guidance.cause}</p>
                          <p className="font-medium text-foreground">{guidanceIntro(level)}</p>
                          <ul className="list-disc space-y-0.5 pl-4">
                            {guidance.recommendations.slice(0, 3).map((rec, i) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
              {latestOwn.length === 0 && (
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
          <SatelliteSnapshot label={settlement.name} lat={settlement.lat} lon={settlement.lon} bboxDegrees={0.15} />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Other Hazards (inherited from {settlement.district.name})</h2>
        <p className="mb-3 text-xs text-muted">
          These hazard categories aren&apos;t computed independently per settlement — shown here as the
          parent district&apos;s current score.
        </p>
        <div className="flex flex-wrap gap-2">
          {inherited.map((r) => {
            const meta = HAZARD_LIST.find((h) => h.category === r.category)!;
            return (
              <Link
                key={r.category}
                href={`/districts/${settlement.districtId}`}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs surface-card"
              >
                {meta.icon} {meta.label} · {Math.round(r.score)}
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Community Reports</h2>
          <Link
            href={`/report?district=${settlement.districtId}&settlement=${settlement.id}`}
            className="text-sm"
            style={{ color: "var(--brand-teal)" }}
          >
            + Report an incident here
          </Link>
        </div>
        {reports.length === 0 ? (
          <p className="text-sm text-muted">No community reports submitted yet for {settlement.name}.</p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-lg p-3 text-sm surface-card">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{HAZARD_LIST.find((h) => h.category === r.category)?.label}</span>
                  <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-muted">{r.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function getLatestRiskScoresFor(
  all: Awaited<ReturnType<typeof getLatestRiskScores>>,
  districtId: string,
) {
  return all.filter((r) => r.districtId === districtId);
}
