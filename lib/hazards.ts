export type HazardCategory =
  | "EARTHQUAKE"
  | "TSUNAMI"
  | "LANDSLIDE"
  | "FLOOD_RIVER"
  | "FLOOD_COASTAL"
  | "DROUGHT"
  | "WILDFIRE"
  | "STORM_WIND"
  | "AIR_QUALITY"
  | "EPIDEMIC_HUMAN"
  | "EPIDEMIC_ANIMAL"
  | "CROP_PEST_DISEASE"
  | "MARINE_HAZARD";

export type Domain = "land" | "ocean" | "air" | "biological";

export interface HazardMeta {
  category: HazardCategory;
  label: string;
  domain: Domain;
  icon: string;
  description: string;
}

export const HAZARDS: Record<HazardCategory, HazardMeta> = {
  EARTHQUAKE: {
    category: "EARTHQUAKE",
    label: "Earthquake",
    domain: "land",
    icon: "\u{1F30D}",
    description: "Seismic activity from USGS/GDACS within the regional monitoring radius.",
  },
  TSUNAMI: {
    category: "TSUNAMI",
    label: "Tsunami",
    domain: "ocean",
    icon: "\u{1F30A}",
    description: "Triggered by strong shallow offshore earthquakes near the Atlantic margin.",
  },
  LANDSLIDE: {
    category: "LANDSLIDE",
    label: "Landslide",
    domain: "land",
    icon: "⛰️",
    description: "Rainfall-triggered slope failure risk, highest on Freetown Peninsula hills.",
  },
  FLOOD_RIVER: {
    category: "FLOOD_RIVER",
    label: "River / Flash Flood",
    domain: "land",
    icon: "\u{1F30A}",
    description: "Heavy rainfall and catchment overflow risk to riverine and low-lying districts.",
  },
  FLOOD_COASTAL: {
    category: "FLOOD_COASTAL",
    label: "Coastal Flood / Storm Surge",
    domain: "ocean",
    icon: "\u{1F30C}",
    description: "Tidal surge and wave run-up risk to coastal districts and estuaries.",
  },
  DROUGHT: {
    category: "DROUGHT",
    label: "Drought",
    domain: "land",
    icon: "☀️",
    description: "Rainfall deficit relative to seasonal norms, affecting subsistence agriculture.",
  },
  WILDFIRE: {
    category: "WILDFIRE",
    label: "Wildfire / Bush Fire",
    domain: "land",
    icon: "\u{1F525}",
    description: "Active fire hotspots from satellite thermal detection, dry-season bush burning.",
  },
  STORM_WIND: {
    category: "STORM_WIND",
    label: "Severe Storm / Windstorm",
    domain: "air",
    icon: "\u{1F32C}️",
    description: "Damaging wind gusts and tropical disturbance tracking.",
  },
  AIR_QUALITY: {
    category: "AIR_QUALITY",
    label: "Air Quality / Harmattan Dust",
    domain: "air",
    icon: "\u{1F32B}️",
    description: "Particulate matter (PM10/PM2.5) and Saharan dust affecting health and aviation.",
  },
  EPIDEMIC_HUMAN: {
    category: "EPIDEMIC_HUMAN",
    label: "Human Disease Outbreak",
    domain: "biological",
    icon: "\u{1FA7A}",
    description: "Cholera, Lassa fever, mpox and other outbreak signal from humanitarian reporting.",
  },
  EPIDEMIC_ANIMAL: {
    category: "EPIDEMIC_ANIMAL",
    label: "Livestock Disease",
    domain: "biological",
    icon: "\u{1F404}",
    description: "African swine fever, Newcastle disease and other epizootic risk.",
  },
  CROP_PEST_DISEASE: {
    category: "CROP_PEST_DISEASE",
    label: "Crop Pest / Disease",
    domain: "biological",
    icon: "\u{1F33E}",
    description: "Fall armyworm, rice blast, cassava mosaic and black pod risk by season and crop.",
  },
  MARINE_HAZARD: {
    category: "MARINE_HAZARD",
    label: "Marine / Coastal Erosion",
    domain: "ocean",
    icon: "\u{1F41F}",
    description: "Rough seas and wave conditions affecting fishing communities and coastline stability.",
  },
};

export const HAZARD_LIST: HazardMeta[] = Object.values(HAZARDS);

export const DOMAIN_LABELS: Record<Domain, string> = {
  land: "Land",
  ocean: "Ocean & Coast",
  air: "Air & Atmosphere",
  biological: "Biological (Human, Livestock & Crops)",
};

export type RiskLevel = "GREEN" | "YELLOW" | "ORANGE" | "RED";

// Fixed status palette (never themed) — validated via the dataviz skill's
// six-checks script against both light and dark chart surfaces. Because
// "warning"/"serious" fall under 3:1 contrast by design, every use pairs
// the color with an icon + text label; color never carries meaning alone.
export const RISK_LEVEL_META: Record<
  RiskLevel,
  { label: string; shortLabel: string; color: string; textColor: string }
> = {
  GREEN: { label: "Safe", shortLabel: "Safe", color: "#0ca30c", textColor: "#ffffff" },
  YELLOW: { label: "Caution", shortLabel: "Caution", color: "#fab219", textColor: "#1c1917" },
  ORANGE: { label: "Warning", shortLabel: "Warning", color: "#ec835a", textColor: "#1c1917" },
  RED: { label: "Critical", shortLabel: "Critical", color: "#d03b3b", textColor: "#ffffff" },
};

export function scoreToLevel(score: number): RiskLevel {
  if (score >= 75) return "RED";
  if (score >= 50) return "ORANGE";
  if (score >= 25) return "YELLOW";
  return "GREEN";
}
