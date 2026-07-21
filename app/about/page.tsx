const SOURCES = [
  {
    name: "USGS Earthquake Hazards Program",
    use: "Live seismic events (FDSN Event API), distance-weighted to each district centroid.",
    url: "https://earthquake.usgs.gov/fdsnws/event/1/",
    auth: "None",
  },
  {
    name: "GDACS (Global Disaster Alert and Coordination System)",
    use: "Live earthquake, flood, drought, wildfire and tropical storm alert events for Sierra Leone.",
    url: "https://www.gdacs.org/",
    auth: "None",
  },
  {
    name: "Open-Meteo Forecast API",
    use: "14-day rainfall accumulation and wind gusts, driving flood, landslide and storm signals.",
    url: "https://open-meteo.com/en/docs",
    auth: "None",
  },
  {
    name: "Open-Meteo Historical Weather API (ERA5)",
    use: "Year-over-year rainfall anomaly as a drought proxy.",
    url: "https://open-meteo.com/en/docs/historical-weather-api",
    auth: "None",
  },
  {
    name: "Open-Meteo Flood API (GloFAS v4)",
    use: "River discharge vs. seasonal median — the single biggest accuracy lever for river flood risk, at both district and settlement level.",
    url: "https://open-meteo.com/en/docs/flood-api",
    auth: "None",
  },
  {
    name: "Open-Meteo Elevation API",
    use: "Static elevation per district/settlement — low-lying land gets a flood-exposure multiplier.",
    url: "https://open-meteo.com/en/docs/elevation-api",
    auth: "None",
  },
  {
    name: "Open-Meteo Marine Weather API",
    use: "Wave height forecasts for coastal flood and marine hazard signals.",
    url: "https://open-meteo.com/en/docs/marine-weather-api",
    auth: "None",
  },
  {
    name: "Open-Meteo Air Quality API (Copernicus CAMS)",
    use: "PM10/PM2.5 forecasts capturing Harmattan dust events.",
    url: "https://open-meteo.com/en/docs/air-quality-api",
    auth: "None",
  },
  {
    name: "NASA GIBS (satellite imagery layers)",
    use: "True-color, NDVI vegetation health and IMERG precipitation map layers — visualizes hazard cause directly.",
    url: "https://nasa-gibs.github.io/gibs-api-docs/",
    auth: "None",
  },
  {
    name: "NASA FIRMS (VIIRS active fire detection)",
    use: "Satellite fire hotspot counts per district for wildfire risk.",
    url: "https://firms.modaps.eosdis.nasa.gov/api/",
    auth: "Free personal MAP_KEY (optional — falls back to seasonal climatology)",
  },
  {
    name: "ReliefWeb API (OCHA)",
    use: "Humanitarian situation reports scanned for epidemic/livestock-disease keywords.",
    url: "https://apidoc.reliefweb.int/",
    auth: "Free appname required since Nov 2025 (optional — source no-ops until configured)",
  },
  {
    name: "OpenStreetMap (Overpass API)",
    use: "Real city/town/area place data for the 386-place settlement drill-down.",
    url: "https://overpass-api.de/",
    auth: "None",
  },
  {
    name: "geoBoundaries",
    use: "Real Sierra Leone district administrative boundary polygons for the map.",
    url: "https://www.geoboundaries.org/",
    auth: "None",
  },
];

const COMPETITORS = [
  {
    name: "GDACS",
    feature: "Green/Orange/Red multi-hazard alert levels",
    parity: "Adopted the same 4-tier semantics (Safe/Caution/Warning/Critical) for every hazard category.",
  },
  {
    name: "PDC DisasterAWARE",
    feature: "Unified severity model across dozens of hazard types + population exposure",
    parity: "13 hazard categories across land/ocean/air/biological domains, population-density exposure factor in every score.",
  },
  {
    name: "INFORM Risk Index",
    feature: "Hazard × Vulnerability × Coping-capacity composite",
    parity: "Same three-factor composite (hazard intensity, exposure, vulnerability) computed per district and per settlement.",
  },
  {
    name: "Google Flood Hub / GloFAS",
    feature: "River discharge-based flood forecasting",
    parity: "Live GloFAS river-discharge anomaly feeds FLOOD_RIVER at both district and place level.",
  },
  {
    name: "NASA Worldview",
    feature: "Satellite imagery layers for situational awareness",
    parity: "True-color, NDVI and IMERG precipitation layers toggleable directly on the live map.",
  },
  {
    name: "Ushahidi",
    feature: "Crowdsourced citizen incident reporting",
    parity: "Community incident reports down to city/town/area level, reviewed via an admin moderation queue.",
  },
  {
    name: "FEWS NET",
    feature: "Food security / drought early warning",
    parity: "Drought signal (rainfall anomaly) directly feeds a crop pest & disease risk model per district's dominant crops.",
  },
  {
    name: "EM-DAT / ReliefWeb disaster archive",
    feature: "Historical disaster record with source citations",
    parity: "Curated historical timeline (2012 cholera, 2014-16 Ebola, 2017 Regent mudslide, 2025 mpox, and more).",
  },
  {
    name: "WOAH/WAHIS",
    feature: "Livestock disease outbreak notification",
    parity: "Livestock disease category with endemic baseline (ASF, FMD) plus ReliefWeb live signal.",
  },
];

const FAQ = [
  {
    q: "How current is the data?",
    a: "As current as the last time someone clicked \"Refresh live data\" on the dashboard. For continuous operation, wire POST /api/ingest to a scheduler (see README).",
  },
  {
    q: "Why do some hazards show \"Fallback mode\" in Settings?",
    a: "NASA FIRMS and ReliefWeb require a free personal key/appname. Without one, those two categories use a documented seasonal/geographic model instead of live satellite/humanitarian data — see Settings for status.",
  },
  {
    q: "Can I trust this for real emergency decisions?",
    a: "No — this is a portfolio demonstration, not an official early-warning system. For real emergencies, use Sierra Leone's National Disaster Management Agency channels, GDACS, and NOAA PTWC directly.",
  },
  {
    q: "Why is a satellite image sometimes blank?",
    a: "Optical satellite layers (true-color, NDVI) have real no-data gaps under persistent cloud cover — routine behavior for NASA GIBS/Worldview, not a bug.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Sources, Methodology &amp; Help</h1>
        <p className="mt-2 text-sm text-muted">
          This is a portfolio project, not an official government early-warning system. It is built
          entirely on public data — every number on the dashboard traces back to one of the sources
          below or a documented model baseline.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Live &amp; modeled data sources</h2>
        <div className="overflow-x-auto rounded-xl surface-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Used for</th>
                <th className="px-3 py-2">Auth</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {SOURCES.map((s) => (
                <tr key={s.name}>
                  <td className="px-3 py-2 font-medium">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {s.name}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-muted">{s.use}</td>
                  <td className="px-3 py-2 text-muted">{s.auth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Risk formula</h2>
        <div className="rounded-xl p-4 font-mono text-sm surface-card">
          score = hazardIntensity × 0.55 + exposure × 0.25 + vulnerability × 0.20
        </div>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>
            <strong className="text-foreground">hazardIntensity</strong> — mean of all live signals
            reported for a (district, hazard) pair in the latest ingestion run, each already normalized
            0-100.
          </li>
          <li>
            <strong className="text-foreground">exposure</strong> — population density (min-max
            normalized across all 16 districts), further adjusted by elevation for flood categories and
            by place-type for settlements.
          </li>
          <li>
            <strong className="text-foreground">vulnerability</strong> — a static, illustrative 0-1
            composite per district approximating relative poverty/infrastructure/health-access gaps
            (×100). This is a stand-in for a real INFORM/DHS subnational vulnerability index.
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted">
          Scores map to levels the same way GDACS does: <strong className="text-foreground">Safe</strong>{" "}
          &lt;25, <strong className="text-foreground">Caution</strong> 25-49,{" "}
          <strong className="text-foreground">Warning</strong> 50-74,{" "}
          <strong className="text-foreground">Critical</strong> ≥75.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">City → Town → Area drill-down</h2>
        <p className="text-sm text-muted">
          Beneath each of the 16 districts, 386 real cities, towns and named areas (from
          OpenStreetMap) get their own flood and drought risk, computed from their own coordinates —
          not just inherited from the district average. Every other hazard category is shown at the
          settlement level by reading the parent district&apos;s current score directly, clearly labeled
          as inherited.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">How this compares to global platforms</h2>
        <div className="overflow-x-auto rounded-xl surface-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Platform</th>
                <th className="px-3 py-2">Their feature</th>
                <th className="px-3 py-2">This system</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {COMPETITORS.map((c) => (
                <tr key={c.name}>
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2 text-muted">{c.feature}</td>
                  <td className="px-3 py-2 text-muted">{c.parity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">FAQ</h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="rounded-lg p-3 text-sm surface-card">
              <summary className="cursor-pointer font-medium">{f.q}</summary>
              <p className="mt-1.5 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
