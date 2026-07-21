import { prisma } from "@/lib/prisma";
import { getLatestRiskScores } from "@/lib/queries";
import { RiskBarChart } from "@/components/charts/RiskBarChart";
import { SeverityDonut } from "@/components/charts/SeverityDonut";
import { HAZARD_LIST, scoreToLevel, type RiskLevel, type HazardCategory } from "@/lib/hazards";

export const dynamic = "force-dynamic";

export default async function RiskAnalysisPage() {
  const [districts, riskScores] = await Promise.all([
    prisma.district.findMany({ orderBy: { name: "asc" } }),
    getLatestRiskScores(),
  ]);

  const byDistrict = new Map<string, typeof riskScores>();
  for (const r of riskScores) {
    const list = byDistrict.get(r.districtId) ?? [];
    list.push(r);
    byDistrict.set(r.districtId, list);
  }

  const districtRisk = districts
    .map((d) => {
      const scores = byDistrict.get(d.id) ?? [];
      const overall = scores.length > 0 ? scores.reduce((a, b) => a + b.score, 0) / scores.length : 0;
      return { id: d.id, name: d.name, score: Math.round(overall * 10) / 10 };
    })
    .sort((a, b) => b.score - a.score);

  const byCategory = new Map<HazardCategory, number[]>();
  for (const r of riskScores) {
    const list = byCategory.get(r.category) ?? [];
    list.push(r.score);
    byCategory.set(r.category, list);
  }
  const categoryRisk = HAZARD_LIST.map((h) => {
    const values = byCategory.get(h.category as HazardCategory) ?? [];
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return { id: h.category, name: `${h.icon} ${h.label}`, score: Math.round(avg * 10) / 10 };
  }).sort((a, b) => b.score - a.score);

  const severityCounts: Record<RiskLevel, number> = { RED: 0, ORANGE: 0, YELLOW: 0, GREEN: 0 };
  for (const d of districtRisk) severityCounts[scoreToLevel(d.score)]++;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Risk Analysis</h1>
        <p className="mt-1 text-sm text-muted">
          Compare composite risk across every district and every hazard category from the latest
          ingestion run.
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-xl p-5 surface-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Districts by status
          </h2>
          <SeverityDonut counts={severityCounts} />
        </div>
        <div className="rounded-xl p-5 surface-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Average risk by hazard category (all districts)
          </h2>
          <RiskBarChart
            items={categoryRisk.map((c) => ({ id: c.id, label: c.name, score: c.score, href: "/risk-analysis" }))}
          />
        </div>
      </section>

      <section className="rounded-xl p-5 surface-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          All 16 districts, ranked by composite risk
        </h2>
        <RiskBarChart
          items={districtRisk.map((d) => ({ id: d.id, label: d.name, score: d.score, href: `/districts/${d.id}` }))}
        />
      </section>
    </div>
  );
}
