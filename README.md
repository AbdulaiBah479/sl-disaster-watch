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

The data layer is Postgres (a free [Neon](https://neon.tech) or
[Supabase](https://supabase.com) project takes under a minute to create and
gives you a `DATABASE_URL` connection string — no local Postgres install
needed). Requires Node 20.19+/22.12+/24+ (see `.nvmrc`).

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL at minimum
npx prisma migrate deploy
npm run db:seed              # seeds 16 districts, 386 settlements, historical archive
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then click **Refresh live
data** to run the first ingestion (~5-10s; pulls from USGS, GDACS, Open-Meteo
and computes settlement-level risk — all keyless, so this works with zero
API configuration once `DATABASE_URL` is set).

### Optional: enable every source

Two sources require a free registration; the app runs fine without them
(they fall back to a seasonal/geographic model) but are more accurate live:

```bash
# .env
FIRMS_MAP_KEY=...        # https://firms.modaps.eosdis.nasa.gov/api/map_key/
RELIEFWEB_APPNAME=...    # https://apidoc.reliefweb.int/parameters#appname
```

### Keeping data fresh automatically

`POST /api/ingest` re-pulls every source and recomputes risk — it's wired to
three triggers:

- The dashboard's **Refresh live data** button (manual, on demand).
- **In-process scheduler** (`instrumentation.ts`) — arms a `setInterval` the
  moment the Next.js server boots, re-running ingestion every
  `INGEST_AUTO_INTERVAL_MINUTES` (default 15) for as long as the process
  stays up. This is what keeps data fresh with **zero setup** on `next dev`
  and on any persistently-running deployment (self-hosted `next start`,
  Docker, Fly.io, Railway, Render).
- `.github/workflows/ingest-cron.yml`, a GitHub Actions schedule that hits
  the endpoint every 15 minutes over HTTP. **This is the one that matters
  for Netlify** — Netlify Functions are stateless/serverless, so they don't
  keep a process alive for `setInterval` to fire in; the in-process
  scheduler is effectively a no-op there. Set it up once you've deployed:
  1. Deploy the site (e.g. to Netlify — see below).
  2. In the GitHub repo: **Settings → Secrets and variables → Actions →
     Variables** → add `SITE_URL` = your deployed URL (e.g.
     `https://sl-disaster-watch.netlify.app`).
  3. That's it — the workflow runs on its own schedule, or trigger it manually
     from the **Actions** tab (`workflow_dispatch`).

All three triggers call the same gated `runIngestionIfDue()`
(`lib/ingest.ts`), so `INGEST_MIN_INTERVAL_MINUTES` (default 10, in `.env`)
guards against overlapping runs hammering the free external APIs no matter
which trigger fires first — a call that arrives too soon after the last one
is skipped and reports why, instead of re-fetching everything.

### Real-time alert notifications

When the risk engine creates a new Warning/Critical alert
(`syncAlerts()` in `lib/riskEngine.ts`), it pushes a browser notification via
Web Push (`lib/push.ts`) to everyone subscribed — no account or app install
needed. Click the 🛎️ icon in the top bar to opt in (prompts for browser
notification permission, registers `public/sw.js`, and stores the
subscription in `PushSubscription`). Requires the VAPID keypair in
`.env`/Netlify env vars; generate one with:

```bash
npx web-push generate-vapid-keys
```

### Admin access, roles & audit trail

`/admin` (report moderation) is gated behind a real session — no self
sign-up, since institutional accounts should be provisioned deliberately,
not opened to anyone who finds the URL. Create the first account with:

```bash
npm run db:create-admin -- you@example.com "a strong password (12+ chars)" "Optional Name" [ROLE] [districtId]
```

`ROLE` is `ADMIN` (default), `REVIEWER`, or `DISTRICT_OFFICER`. A
`DISTRICT_OFFICER` needs a `districtId` (see `lib/districts.ts` for valid
ids, e.g. `western_urban`) and only ever sees/moderates reports and alert
verifications for that one district — `ADMIN`/`REVIEWER` see everything.
Every role can moderate citizen reports and mark an `Alert` **✓ Agency
Verified** (`POST /api/alerts/[id]/verify`) — an explicit human endorsement
layered on top of the risk engine's algorithmic output, shown as a distinct
badge on `/alerts` so "the model says" and "an agency confirmed" never look
the same. Only `ADMIN` can see `/admin/audit-log`, an append-only record
of every moderation/verification action — who, what, when
(`AuditLog` model, `lib/auditLog.ts`).

Sessions are server-side rows (`Session` model), so revoking access is a
delete, not a token-expiry wait — a session lasts 7 days and is carried by
an `httpOnly` cookie (`lib/auth.ts`); passwords are hashed with Node's
built-in `scrypt`, no extra dependency. `GET/PATCH /api/reports*` and
`POST /api/alerts/[id]/verify` enforce the same session + district-scope
check server-side, not just the page.

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
- **Push notifications** — opt in via the 🛎️ icon in the top bar to get a
  browser notification the moment a new Warning/Critical alert fires,
  without checking the dashboard. See "Real-time alert notifications" below.
- **Disaster agency directory** (`/agencies`) — every real Sierra Leone
  coordinating body (NDMA, ONS, SLMet, Red Cross, NPHA, EPA-SL and more) plus
  the international/technical partners this dashboard already cites,
  grouped by hazard coverage with mandate, hotline/website and a source
  citation per entry — see `lib/agencies.ts`.
- **Institutional roles & audit trail** — `ADMIN` / `REVIEWER` /
  `DISTRICT_OFFICER` accounts, a district-scoped view for officers, agency
  verification of algorithmic alerts, and an append-only audit log at
  `/admin/audit-log`. See "Admin access, roles & audit trail" below.

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
lib/push.ts                  → Web Push sender, called from syncAlerts() on
                             every new/escalated Alert; prunes dead subscriptions
lib/agencies.ts               → real Sierra Leone + international disaster
                             agencies, each source-cited; powers /agencies
lib/sources/noaaPtwc.ts        → NOAA PTWC's public Atom feed, blended into
                             TSUNAMI in riskEngine.ts (see Data sources). NDMA
                             has no public API/feed as of this writing — its
                             OfficialChannels widget links out directly
                             instead; wiring in live NDMA data is one new
                             lib/sources/*.ts module away if that changes.
lib/auth.ts                   → password hashing (scrypt) + server-side
                             sessions; requireSession()/requireRole()/
                             canAccessDistrict() gate mutating routes
lib/auditLog.ts                → append-only log of every moderation/
                             verification action; powers /admin/audit-log
app/admin/layout.tsx           → page-level gate — redirects to /login if
                             there's no valid session
lib/ingest.ts                → orchestrates a full pull + persists everything;
                             runIngestionIfDue() is the shared min-interval gate
instrumentation.ts            → in-process scheduler — see "Keeping data
                             fresh automatically" below
app/api/ingest               → POST triggers the pipeline above; scheduled by
                             .github/workflows/ingest-cron.yml
app/api/push/subscribe       → POST saves a browser's Web Push subscription
app/api/push/unsubscribe     → POST removes one
app/api/*                    → read endpoints for the dashboard
prisma/schema.prisma          → District, Settlement, HazardSignal, RiskScore /
                             SettlementRiskScore (append-only logs), Alert,
                             HistoricalDisaster, CitizenReport, PushSubscription
scripts/build-settlements.mjs → one-time data-build: Overpass (OSM) place data,
                             point-in-polygon filtered to Sierra Leone,
                             assigned to the nearest of the 16 districts →
                             lib/settlements-data.json (committed, not re-run
                             at request time)
```

Data model: Postgres via Prisma 7 (`@prisma/adapter-pg`) — a free Neon/Supabase
project is enough, see Quick start. (Earlier versions of this project used
bundled SQLite for zero-config setup, but Netlify Functions ship a read-only
deploy bundle with no persistent disk, so writes from a scheduled ingest
never survived past a single invocation — Postgres is required for the
"always fresh" data described below.)

Continuous operation: `POST /api/ingest` is wired to
`.github/workflows/ingest-cron.yml` (GitHub Actions, every 15 min) in addition
to the manual dashboard button — see "Keeping data fresh automatically" above.

## Data sources

| Source | Used for | Auth |
|---|---|---|
| [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/fdsnws/event/1/) | Live seismic events | None |
| [GDACS](https://www.gdacs.org/) | Earthquake/flood/drought/wildfire/storm alerts for Sierra Leone | None |
| [NOAA Pacific Tsunami Warning Center](https://www.tsunami.gov/) | Live Atom bulletin feed — genuine Watch/Advisory/Warning anywhere basin-relevant lifts the TSUNAMI score; otherwise reinforces the low earthquake-derived baseline | None |
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
