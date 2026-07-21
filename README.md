# SL Disaster Watch

A multi-hazard early warning and risk analytics platform for **Sierra Leone** —
built entirely on free/public data sources, in the spirit of GDACS, PDC
DisasterAWARE, the INFORM Risk Index, Ushahidi, FEWS NET and NASA Worldview.

It predicts risk at three levels of granularity — **district → city/town →
area** — across **13 hazard categories** spanning land, ocean, air and
biological domains: earthquakes, tsunamis, landslides, river and coastal
flooding, drought, wildfire, severe storms, air quality (Harmattan dust), and
human, livestock and crop disease risk. Flood and drought get the deepest
modeling: live river-discharge data (GloFAS), elevation-weighted exposure,
and place-level computation for 386 real cities, towns and named areas.

## Quick start

```bash
npm install
npx prisma migrate deploy   # or: npx prisma db push
npm run db:seed             # seeds 16 districts, 386 settlements, historical archive
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then click **Refresh live
data** to run the first ingestion (~5-10s; pulls from USGS, GDACS, Open-Meteo
and computes settlement-level risk — all keyless, so this works with zero
configuration).

### Optional: enable every source

Two sources require a free registration; the app runs fine without them
(they fall back to a seasonal/geographic model) but are more accurate live:

```bash
# .env
FIRMS_MAP_KEY=...        # https://firms.modaps.eosdis.nasa.gov/api/map_key/
RELIEFWEB_APPNAME=...    # https://apidoc.reliefweb.int/parameters#appname
```

## What's here

- **Enterprise dashboard shell** — sidebar navigation, top bar with live
  search (district/city/town/area), a notification bell, and a live clock.
- **Dashboard** — KPI row, live map, active-alerts panel, district
  severity donut, top-districts bar chart, district grid with a slide-over
  quick-view drawer, recent activity, hazard taxonomy.
- **Live Map** (`/map`) — Leaflet map with a layer control: OpenStreetMap
  street view, or three **real NASA satellite layers** (true-color, NDVI
  vegetation health, IMERG precipitation), plus toggleable district
  boundaries and city/town markers.
- **City → Town → Area drill-down** — every district page lists its real
  settlements (from OpenStreetMap); each has its own page with independently
  computed flood/drought risk and a breadcrumb trail back to the district.
- **Alerts** (`/alerts`), **Risk Analysis** (`/risk-analysis`), **History**
  (`/history`), **Settings** (`/settings`, source status + ingestion log),
  **Admin** (`/admin`, report moderation queue).
- **Hazard cause & recommended action** — every risk row expands into a
  plain-language cause explanation and 2-4 recommended actions with the
  real Sierra Leonean coordinating body named (NDMA, Red Cross, Ministry of
  Agriculture, etc.) — see `lib/recommendations.ts`.
- **Citizen reporting** (`/report`) — Ushahidi-style incident reports,
  taggable down to the settlement level, reviewed via `/admin`.

## Architecture

```
lib/sources/*             → one module per external API, each returns normalized
                             0-100 "signal candidates" per (district, hazard)
lib/riskEngine.ts          → blends this run's signals with population-density +
                             elevation exposure and a static vulnerability
                             baseline into a 0-100 composite score, syncs Alerts
lib/settlementRiskEngine.ts → same composite formula computed per settlement for
                             FLOOD_RIVER / FLOOD_COASTAL (own rainfall + GloFAS
                             discharge); DROUGHT inherits the district's score
                             (slow-onset, regionally correlated — not worth a
                             per-point historical-archive query)
lib/elevationBackfill.ts    → one-time-per-point elevation fetch, cached in DB
lib/recommendations.ts      → hazard cause + recommended-action knowledge base
lib/satellite.ts            → NASA GIBS layer config consumed by the map
lib/ingest.ts                → orchestrates a full pull + persists everything
app/api/ingest               → POST triggers the pipeline above
app/api/*                    → read endpoints for the dashboard
prisma/schema.prisma          → District, Settlement, HazardSignal, RiskScore /
                             SettlementRiskScore (append-only logs), Alert,
                             HistoricalDisaster, CitizenReport
scripts/build-settlements.mjs → one-time data-build: Overpass (OSM) place data,
                             point-in-polygon filtered to Sierra Leone,
                             assigned to the nearest of the 16 districts →
                             lib/settlements-data.json (committed, not re-run
                             at request time)
```

Data model: SQLite via Prisma 7 (`@prisma/adapter-better-sqlite3`) — zero
external database setup required for a portfolio demo. Swap the adapter for
Postgres in `lib/prisma.ts` / `prisma.config.ts` for production use.

For continuous operation, wire `POST /api/ingest` to a scheduler (Vercel Cron,
GitHub Actions, or any cron) instead of the manual dashboard button.

## Data sources

| Source | Used for | Auth |
|---|---|---|
| [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/fdsnws/event/1/) | Live seismic events | None |
| [GDACS](https://www.gdacs.org/) | Earthquake/flood/drought/wildfire/storm alerts for Sierra Leone | None |
| [Open-Meteo Forecast API](https://open-meteo.com/en/docs) | 14-day rainfall, wind gusts | None |
| [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api) | Year-over-year rainfall anomaly (drought) | None |
| [Open-Meteo Flood API (GloFAS v4)](https://open-meteo.com/en/docs/flood-api) | River discharge vs. seasonal median — the biggest flood-accuracy lever | None |
| [Open-Meteo Elevation API](https://open-meteo.com/en/docs/elevation-api) | Static elevation per district/settlement, weights flood exposure | None |
| [Open-Meteo Marine Weather API](https://open-meteo.com/en/docs/marine-weather-api) | Wave height (coastal flood, marine hazard) | None |
| [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) | PM10/PM2.5 (Harmattan dust) | None |
| [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/) | True-color, NDVI and IMERG precipitation map layers | None |
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/) | Satellite active-fire hotspots | Free MAP_KEY (optional) |
| [ReliefWeb API](https://apidoc.reliefweb.int/) | Epidemic/livestock-disease situational signal | Free appname (optional) |
| [OpenStreetMap / Overpass API](https://overpass-api.de/) | Real city/town/area place data (386 settlements) | None |
| [geoBoundaries](https://www.geoboundaries.org/) | Real district boundary polygons for the map | None |

Human epidemic, livestock disease and crop pest/disease risk have no free
real-time district-level API for Sierra Leone, so those categories blend a
documented seasonal/geographic model (the Kenema/Kailahun/Kono "Lassa belt",
rainy-season cholera risk in dense settlements, endemic African swine fever,
rice-blast and fall-armyworm calendars) with any live ReliefWeb signal on top.

Full methodology, the risk formula, a feature-by-feature comparison against
GDACS / PDC DisasterAWARE / INFORM / Google Flood Hub / NASA Worldview /
Ushahidi / FEWS NET / EM-DAT / WOAH-WAHIS, and an FAQ live at `/about`.

## Disclaimer

This is a portfolio project, not an official government early-warning
system. Every figure traces to a cited public source or a clearly labeled
model baseline — see `/about` — but district-level "vulnerability" is an
illustrative composite, not official INFORM/DHS microdata, tsunami risk
should be verified against NOAA PTWC / GDACS directly, and satellite imagery
layers can show real no-data gaps under persistent cloud cover.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Prisma 7
(SQLite) · Leaflet / react-leaflet (+ NASA GIBS WMTS layers) · Zod
