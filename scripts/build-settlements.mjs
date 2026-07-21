// One-time data-build script: turns raw OSM/Overpass place nodes into the
// static lib/settlements-data.json shipped with the app. Not run at request
// time — settlements are static reference data, same treatment as districts.
//
// Usage: node scripts/build-settlements.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import { DISTRICTS } from "../lib/districts.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const boundaries = JSON.parse(
  fs.readFileSync(path.join(root, "public", "data", "sl-districts.geojson"), "utf8"),
);

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function isInSierraLeone(lat, lon) {
  const pt = point([lon, lat]);
  for (const feature of boundaries.features) {
    try {
      if (booleanPointInPolygon(pt, feature)) return true;
    } catch {
      // ignore malformed ring edge cases
    }
  }
  return false;
}

function nearestDistrictId(lat, lon) {
  let best = null;
  let bestDist = Infinity;
  for (const d of DISTRICTS) {
    const dist = distanceKm(lat, lon, d.lat, d.lon);
    if (dist < bestDist) {
      bestDist = dist;
      best = d.id;
    }
  }
  return best;
}

function loadOverpass(file) {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  return raw.elements.filter((e) => e.tags?.name && e.lat && e.lon);
}

const scratch = process.argv[2];
if (!scratch) {
  console.error("Usage: node build-settlements.mjs <scratch-dir-with-overpass-json>");
  process.exit(1);
}

const cityTown = loadOverpass(path.join(scratch, "overpass_towns2.json"));
const areas = loadOverpass(path.join(scratch, "overpass_villages_all.json"));

const seen = new Set();
const settlements = [];

function addSettlement(name, lat, lon, type, population) {
  if (!isInSierraLeone(lat, lon)) return;
  const districtId = nearestDistrictId(lat, lon);
  const key = `${name.toLowerCase()}|${districtId}`;
  if (seen.has(key)) return;
  seen.add(key);
  settlements.push({
    id: key.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    name,
    type,
    districtId,
    lat: Math.round(lat * 10000) / 10000,
    lon: Math.round(lon * 10000) / 10000,
    population: population ? parseInt(String(population).replace(/[^0-9]/g, ""), 10) || null : null,
  });
}

for (const e of cityTown) {
  const type = e.tags.place === "city" ? "CITY" : "TOWN";
  addSettlement(e.tags.name, e.lat, e.lon, type, e.tags.population);
}

// Cap AREA (suburb/neighbourhood/quarter) entries per district — OSM
// coverage skews heavily toward Freetown/Western Area, which is fine (it's
// genuinely where fine-grained hazard history like the 2017 Regent mudslide
// concentrates), but cap so no district page becomes an unusable wall.
const AREA_CAP_PER_DISTRICT = 20;
const areaCountByDistrict = new Map();

// Well-known named areas tied to documented hazard history or landmark
// status always win their district's cap slots first, regardless of raw
// distance-to-capital ordering.
const PRIORITY_NAMES = new Set([
  "regent",
  "leicester village",
  "kissy",
  "wellington",
  "congo town",
  "aberdeen",
  "murray town",
  "wilberforce",
  "hill station",
  "cline town",
  "goderich",
  "lumley",
  "gloucester",
  "tombo",
  "waterloo",
]);

// Order by: priority allowlist first, then proximity to national capital,
// so the most locationally/narratively relevant areas win the per-district cap.
const freetown = DISTRICTS.find((d) => d.id === "western_urban");
const orderedAreas = [...areas].sort((a, b) => {
  const aPriority = PRIORITY_NAMES.has(a.tags.name.toLowerCase()) ? 0 : 1;
  const bPriority = PRIORITY_NAMES.has(b.tags.name.toLowerCase()) ? 0 : 1;
  if (aPriority !== bPriority) return aPriority - bPriority;
  return (
    distanceKm(a.lat, a.lon, freetown.lat, freetown.lon) -
    distanceKm(b.lat, b.lon, freetown.lat, freetown.lon)
  );
});

for (const e of orderedAreas) {
  if (!isInSierraLeone(e.lat, e.lon)) continue;
  const districtId = nearestDistrictId(e.lat, e.lon);
  const count = areaCountByDistrict.get(districtId) ?? 0;
  if (count >= AREA_CAP_PER_DISTRICT) continue;
  areaCountByDistrict.set(districtId, count + 1);
  addSettlement(e.tags.name, e.lat, e.lon, "AREA", null);
}

settlements.sort((a, b) => a.districtId.localeCompare(b.districtId) || a.name.localeCompare(b.name));

fs.writeFileSync(
  path.join(root, "lib", "settlements-data.json"),
  JSON.stringify(settlements, null, 2),
);

const byType = settlements.reduce((acc, s) => {
  acc[s.type] = (acc[s.type] ?? 0) + 1;
  return acc;
}, {});
console.log(`Wrote ${settlements.length} settlements`, byType);
