import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SOURCE_ROWS = [
  { key: "USGS", label: "USGS Earthquakes", configured: true },
  { key: "GDACS", label: "GDACS Multi-Hazard Alerts", configured: true },
  { key: "OPEN_METEO_WEATHER", label: "Open-Meteo Weather", configured: true },
  { key: "OPEN_METEO_DROUGHT", label: "Open-Meteo Historical (Drought)", configured: true },
  { key: "OPEN_METEO_MARINE", label: "Open-Meteo Marine", configured: true },
  { key: "OPEN_METEO_AIR_QUALITY", label: "Open-Meteo Air Quality", configured: true },
  { key: "OPEN_METEO_FLOOD", label: "Open-Meteo Flood (GloFAS)", configured: true },
  {
    key: "FIRMS",
    label: "NASA FIRMS Satellite Fire Detection",
    configured: Boolean(process.env.FIRMS_MAP_KEY),
    setupUrl: "https://firms.modaps.eosdis.nasa.gov/api/map_key/",
  },
  {
    key: "RELIEFWEB",
    label: "ReliefWeb Humanitarian Reports",
    configured: Boolean(process.env.RELIEFWEB_APPNAME),
    setupUrl: "https://apidoc.reliefweb.int/parameters#appname",
  },
];

export default async function SettingsPage() {
  const runs = await prisma.ingestionRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 24,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Settings &amp; Data Sources</h1>
        <p className="mt-1 text-sm text-muted">
          Configuration status for every ingestion source, and a log of recent ingestion runs.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Source status</h2>
        <div className="overflow-hidden rounded-xl surface-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Setup</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {SOURCE_ROWS.map((s) => (
                <tr key={s.key}>
                  <td className="px-4 py-2.5 font-medium">{s.label}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: s.configured ? "var(--status-good)22" : "var(--status-warning)22",
                        color: s.configured ? "var(--status-good)" : "#92620a",
                      }}
                    >
                      {s.configured ? "● Active" : "○ Fallback mode"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {s.setupUrl && !s.configured ? (
                      <a href={s.setupUrl} target="_blank" rel="noopener noreferrer" className="underline">
                        Get free key
                      </a>
                    ) : (
                      <span className="text-muted">No key required</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Recent ingestion runs</h2>
        <div className="overflow-hidden rounded-xl surface-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Items</th>
                <th className="px-4 py-2.5">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 font-medium">{r.source}</td>
                  <td className="px-4 py-2 text-xs">{r.status}</td>
                  <td className="px-4 py-2 text-xs">{r.itemsFetched}</td>
                  <td className="px-4 py-2 text-xs text-muted">{new Date(r.startedAt).toLocaleString()}</td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted">
                    No ingestion runs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
