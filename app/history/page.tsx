import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { HAZARD_LIST } from "@/lib/hazards";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const disasters = await prisma.historicalDisaster.findMany({
    orderBy: { date: "desc" },
    include: { district: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Historical Disaster Archive</h1>
        <p className="mt-1 text-sm text-muted">
          A curated, source-cited record of documented Sierra Leone disasters — the same kind of
          precedent record EM-DAT and ReliefWeb maintain — used to contextualize today&apos;s risk scores
          against what has actually happened before.
        </p>
      </div>

      <ol className="relative space-y-6 border-s pl-6" style={{ borderColor: "var(--border)" }}>
        {disasters.map((d) => {
          const meta = HAZARD_LIST.find((h) => h.category === d.category);
          return (
            <li key={d.id} className="relative">
              <span
                className="absolute -left-7.25 top-1 h-4 w-4 rounded-full"
                style={{ background: "var(--border-strong)" }}
              />
              <p className="text-xs font-medium text-muted">
                {new Date(d.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </p>
              <h2 className="mt-0.5 font-semibold">
                {meta?.icon} {d.title}
                {d.district && (
                  <Link
                    href={`/districts/${d.district.id}`}
                    className="ml-2 text-sm font-normal hover:underline"
                    style={{ color: "var(--brand-teal)" }}
                  >
                    {d.district.name}
                  </Link>
                )}
              </h2>
              <p className="mt-1 text-sm text-muted">{d.description}</p>
              {(d.deaths || d.affected) && (
                <p className="mt-1 text-xs text-muted">
                  {d.deaths ? `${d.deaths.toLocaleString()} deaths` : ""}
                  {d.deaths && d.affected ? " · " : ""}
                  {d.affected ? `${d.affected.toLocaleString()} affected` : ""}
                </p>
              )}
              <p className="mt-1 text-xs text-muted">
                Source:{" "}
                {d.sourceUrl ? (
                  <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    {d.source}
                  </a>
                ) : (
                  d.source
                )}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
