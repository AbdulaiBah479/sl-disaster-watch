import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ReportForm } from "@/components/ReportForm";
import { HAZARD_LIST } from "@/lib/hazards";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const [districts, recentReports] = await Promise.all([
    prisma.district.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.citizenReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { district: true, settlement: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Report an Incident</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Community incident reporting, in the spirit of Ushahidi-style crisis mapping. Reports are
          reviewed by moderators and shown alongside — never silently folded into — the algorithmic risk
          scores.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-xl p-5 surface-card">
          <Suspense fallback={<p className="text-sm text-muted">Loading form…</p>}>
            <ReportForm districts={districts} />
          </Suspense>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Recent reports</h2>
          {recentReports.length === 0 ? (
            <p className="text-sm text-muted">No community reports submitted yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentReports.map((r) => {
                const meta = HAZARD_LIST.find((h) => h.category === r.category);
                return (
                  <li key={r.id} className="rounded-lg p-3 text-sm surface-card">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {meta?.icon} {r.settlement ? `${r.settlement.name}, ` : ""}
                        {r.district.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted">
                        {formatDate(r.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-muted">{r.description}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">{r.status}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
