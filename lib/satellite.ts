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
