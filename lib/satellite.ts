// NASA GIBS (Global Imagery Browse Services) — free, public WMTS tile
// service, no API key. https://nasa-gibs.github.io/gibs-api-docs/
//
// These are real satellite-derived layers used to visually show hazard
// *cause*, not decoration: true-color for cloud/flood-water/burn-scar
// visibility, NDVI for vegetation stress (drought), IMERG for the rainfall
// actually driving a flood signal. Optical layers can have no-data gaps
// under persistent cloud cover (routine for GIBS/Worldview, not a bug) —
// Leaflet simply renders those tiles blank, so layers degrade gracefully.
export interface SatelliteLayerConfig {
  id: string;
  label: string;
  description: string;
  gibsLayer: string;
  format: "jpg" | "png";
  maxNativeZoom: number;
  relevantFor: string[];
  daysAgo: number; // imagery latency — most GIBS layers post next-day
}

export const SATELLITE_LAYERS: SatelliteLayerConfig[] = [
  {
    id: "true-color",
    label: "True Color (MODIS)",
    description: "Real daily satellite imagery — see cloud cover, flooding extent and burn scars directly.",
    gibsLayer: "MODIS_Terra_CorrectedReflectance_TrueColor",
    format: "jpg",
    maxNativeZoom: 9,
    relevantFor: ["FLOOD_RIVER", "FLOOD_COASTAL", "WILDFIRE", "STORM_WIND"],
    daysAgo: 1,
  },
  {
    id: "ndvi",
    label: "Vegetation Health (NDVI)",
    description: "8-day vegetation greenness index — browning/stress signals drought impact on crops and land cover.",
    gibsLayer: "MODIS_Terra_NDVI_8Day",
    format: "png",
    maxNativeZoom: 7,
    relevantFor: ["DROUGHT", "CROP_PEST_DISEASE"],
    daysAgo: 9,
  },
  {
    id: "precipitation",
    label: "Precipitation Rate (IMERG)",
    description: "Near-real-time satellite rainfall estimate — the direct driver of river-flood and landslide risk.",
    gibsLayer: "IMERG_Precipitation_Rate",
    format: "png",
    maxNativeZoom: 7,
    relevantFor: ["FLOOD_RIVER", "LANDSLIDE"],
    daysAgo: 1,
  },
];

export function gibsTileUrl(layer: SatelliteLayerConfig, date: Date): string {
  const d = new Date(date.getTime() - layer.daysAgo * 86400_000).toISOString().slice(0, 10);
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer.gibsLayer}/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.${layer.format}`;
}

export interface SnapshotCenter {
  lat: number;
  lon: number;
}

function layerDate(layer: SatelliteLayerConfig, date: Date): Date {
  return new Date(date.getTime() - layer.daysAgo * 86400_000);
}

// On-demand cropped image of a single marked place, via NASA's Worldview
// Snapshots REST API (the same endpoint Worldview's own "Download Snapshot"
// button calls) — distinct from gibsTileUrl's bulk WMTS tiles above, this is
// for the low-volume, interactively-triggered "look at this one spot" case.
// BBOX is west,south,east,north (lon,lat order) even under CRS=EPSG:4326.
export function gibsSnapshotUrl(
  layer: SatelliteLayerConfig,
  date: Date,
  center: SnapshotCenter,
  opts?: { bboxDegrees?: number; width?: number; height?: number },
): string {
  const half = (opts?.bboxDegrees ?? 0.35) / 2;
  const d = layerDate(layer, date).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    REQUEST: "GetSnapshot",
    LAYERS: layer.gibsLayer,
    CRS: "EPSG:4326",
    BBOX: [
      center.lon - half,
      center.lat - half,
      center.lon + half,
      center.lat + half,
    ].join(","),
    FORMAT: layer.format === "jpg" ? "image/jpeg" : "image/png",
    WIDTH: String(opts?.width ?? 512),
    HEIGHT: String(opts?.height ?? 512),
    TIME: d,
  });
  return `https://wvs.earthdata.nasa.gov/api/v1/snapshot?${params.toString()}`;
}

// Recent dates worth offering in a scrubber. NDVI is an 8-day MODIS
// composite — stepping daily would just re-request the same underlying
// image — so it steps by 8 days; true-color/IMERG step daily.
export function recentSnapshotDates(layer: SatelliteLayerConfig, count = 6): Date[] {
  const stepDays = layer.id === "ndvi" ? 8 : 1;
  const base = layerDate(layer, new Date());
  return Array.from({ length: count }, (_, i) => new Date(base.getTime() - i * stepDays * 86400_000));
}

// A citation link back to the source viewer, so a cropped JPEG still
// traces to a browsable, authoritative source (per the project's "every
// figure traces to a cited public source" ethos).
export function worldviewDeepLink(
  layer: SatelliteLayerConfig,
  date: Date,
  center: SnapshotCenter,
  bboxDegrees = 0.35,
): string {
  const half = bboxDegrees / 2;
  const d = layerDate(layer, date).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    v: [center.lon - half, center.lat - half, center.lon + half, center.lat + half].join(","),
    l: layer.gibsLayer,
    t: d,
  });
  return `https://worldview.earthdata.nasa.gov/?${params.toString()}`;
}
