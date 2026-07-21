import type { HazardCategory, RiskLevel } from "@/lib/hazards";

export interface HazardGuidance {
  cause: string;
  recommendations: string[];
  responsibleBodies: string[];
}

// Standard disaster-management guidance per hazard, grounded in what each
// category's live signal actually measures (see lib/riskEngine.ts) — this is
// knowledge-base content, not a live API, and is clearly labeled as such in
// the UI. Bodies named are Sierra Leone's real coordinating agencies.
export const HAZARD_GUIDANCE: Record<HazardCategory, HazardGuidance> = {
  EARTHQUAKE: {
    cause:
      "Seismic activity detected by USGS/GDACS within the regional monitoring radius — Sierra Leone sits on a stable continental margin, so most signal comes from moderate regional events in Guinea/Liberia rather than local faults.",
    recommendations: [
      "Verify structural integrity of public buildings, schools and health facilities in the affected area",
      "Review and rehearse evacuation routes for multi-storey buildings",
      "Avoid non-essential travel near known landslide-prone slopes immediately after a felt tremor",
    ],
    responsibleBodies: ["National Disaster Management Agency (NDMA)", "Sierra Leone Meteorological Agency"],
  },
  TSUNAMI: {
    cause:
      "Derived from nearby earthquake magnitude and depth — Sierra Leone's Atlantic coast is a passive margin (no subduction zone), so baseline risk is low, but any shallow, strong offshore event is monitored as a precaution.",
    recommendations: [
      "Do not rely on this dashboard alone for tsunami warnings — check NOAA PTWC and GDACS directly",
      "Coastal communities should know their nearest high ground and evacuation route",
      "Fishermen and coastal operators should monitor VHF/radio alerts during active seismic events",
    ],
    responsibleBodies: ["NOAA Pacific Tsunami Warning Center", "GDACS", "Sierra Leone Maritime Administration"],
  },
  LANDSLIDE: {
    cause:
      "Intense rainfall over 72 hours on slopes with known susceptibility — the Freetown Peninsula hills (Regent, Leicester, Charlotte, Gloucester) are the highest-risk terrain nationally, site of the 2017 disaster.",
    recommendations: [
      "Avoid construction on steep slopes above 30° without engineered drainage and retaining structures",
      "Clear storm drains before and during the rainy season to prevent water pooling on slopes",
      "Relocate households in mapped high-susceptibility zones ahead of sustained heavy rainfall",
      "Establish community early-warning networks in Western Area Urban/Rural hillside communities",
    ],
    responsibleBodies: ["NDMA", "Freetown City Council", "Ministry of Lands, Housing and Environment"],
  },
  FLOOD_RIVER: {
    cause:
      "Heavy rainfall accumulation combined with elevated river discharge (GloFAS) relative to the seasonal median — low-elevation land near a catchment is where runoff concentrates fastest.",
    recommendations: [
      "Clear culverts and drainage channels ahead of the rainy season peak (June-September)",
      "Avoid building or storing goods in low-lying floodplain areas identified on the risk map",
      "Prepare evacuation points on higher ground for riverine settlements",
      "Coordinate with upstream districts — discharge anomalies often precede downstream flooding by 1-3 days",
    ],
    responsibleBodies: ["NDMA", "Sierra Leone Red Cross Society", "Ministry of Water Resources"],
  },
  FLOOD_COASTAL: {
    cause:
      "Elevated wave height and storm surge potential along the coast, compounded by high tide and heavy rainfall in low-lying coastal settlements.",
    recommendations: [
      "Reinforce or avoid settlement in areas below 3m elevation near the coastline",
      "Maintain mangrove buffers — they measurably reduce storm-surge energy",
      "Fishing communities should secure boats and gear ahead of forecast rough-sea periods",
    ],
    responsibleBodies: ["NDMA", "Environment Protection Agency Sierra Leone"],
  },
  DROUGHT: {
    cause:
      "Rainfall running meaningfully below the same period last year, which stresses rain-fed subsistence agriculture that over two-thirds of the population depends on.",
    recommendations: [
      "Prioritize drought-tolerant crop varieties (cassava, sorghum) in affected planting seasons",
      "Protect and expand access to boreholes and protected wells ahead of shortage periods",
      "Stagger planting dates based on rainfall onset rather than the calendar date",
      "Monitor food-security indicators alongside rainfall — this is FEWS NET's core early-warning signal",
    ],
    responsibleBodies: ["Ministry of Agriculture and Food Security", "FEWS NET", "World Food Programme Sierra Leone"],
  },
  WILDFIRE: {
    cause:
      "Active fire hotspots from satellite thermal detection, or — when no live satellite key is configured — dry-season climatology reflecting widespread slash-and-burn agricultural clearing (December-April).",
    recommendations: [
      "Enforce controlled-burn permits and firebreaks around farmland bordering forest",
      "Avoid burning during high-wind periods; keep water sources accessible near farmland",
      "Report uncontrolled bush fires immediately — they spread fast in dry-season grassland",
    ],
    responsibleBodies: ["NDMA", "Forestry Division, Ministry of Agriculture"],
  },
  STORM_WIND: {
    cause: "Forecast wind gusts exceeding safe thresholds for light structures and small vessels.",
    recommendations: [
      "Secure loose roofing, signage and construction materials ahead of forecast high-wind periods",
      "Postpone small-boat travel during severe wind advisories",
      "Trim trees near power lines and homes before the storm season peaks",
    ],
    responsibleBodies: ["NDMA", "Electricity Distribution and Supply Authority (EDSA)"],
  },
  AIR_QUALITY: {
    cause:
      "Elevated PM10 particulate matter, typically Saharan dust carried by the Harmattan wind (December-March), reducing air quality and visibility.",
    recommendations: [
      "Vulnerable groups (children, elderly, asthma/respiratory patients) should limit prolonged outdoor exposure",
      "Airports and ferry operators should account for reduced visibility in scheduling",
      "Use masks in dense dust conditions if outdoor exposure is unavoidable",
    ],
    responsibleBodies: ["Ministry of Health", "Sierra Leone Civil Aviation Authority"],
  },
  EPIDEMIC_HUMAN: {
    cause:
      "Seasonal/geographic disease ecology (the Kenema-Kailahun-Kono Lassa fever belt, rainy-season cholera risk in dense settlements) combined with any live humanitarian reporting signal.",
    recommendations: [
      "Strengthen rodent control and food storage practices in the Lassa fever belt during dry season",
      "Chlorinate water sources and promote handwashing in dense settlements during rainy season",
      "Maintain outbreak surveillance and rapid-response teams at district health facilities",
      "Coordinate vaccination/response campaigns through the national Public Health Agency",
    ],
    responsibleBodies: ["National Public Health Agency", "WHO Sierra Leone", "Africa CDC"],
  },
  EPIDEMIC_ANIMAL: {
    cause:
      "Endemic livestock disease baseline (African swine fever since 2020, foot-and-mouth disease) plus any live humanitarian/agricultural reporting signal.",
    recommendations: [
      "Practice biosecurity: quarantine new/sick animals before introducing them to a herd",
      "Report suspected outbreaks immediately to veterinary services — early containment matters most",
      "Avoid moving livestock across district lines during an active outbreak",
    ],
    responsibleBodies: ["Ministry of Agriculture — Livestock and Veterinary Services", "WOAH"],
  },
  CROP_PEST_DISEASE: {
    cause:
      "Seasonal agromet risk model combining rainfall/humidity extremes with each district's dominant crops — rice blast and black pod thrive in wet conditions, fall armyworm outbreaks favor dry planting-season spells.",
    recommendations: [
      "Scout fields regularly during the risk window identified for each crop",
      "Use certified disease-resistant seed varieties where available (especially cassava mosaic-resistant stock)",
      "Apply integrated pest management before resorting to broad-spectrum pesticide",
      "Coordinate with agricultural extension officers on timing of planting relative to rainfall onset",
    ],
    responsibleBodies: ["Ministry of Agriculture and Food Security", "FAO Sierra Leone", "Njala University Extension"],
  },
  MARINE_HAZARD: {
    cause: "Elevated wave height forecasts affecting small-craft safety and coastal erosion along fishing communities.",
    recommendations: [
      "Small fishing vessels should avoid departure during rough-sea advisories",
      "Monitor coastal erosion near settlements built close to the shoreline",
      "Coordinate with marine authorities on safe-passage advisories during storm periods",
    ],
    responsibleBodies: ["Sierra Leone Maritime Administration", "Ministry of Fisheries and Marine Resources"],
  },
};

export function guidanceIntro(level: RiskLevel): string {
  switch (level) {
    case "RED":
      return "Immediate action recommended:";
    case "ORANGE":
      return "Elevated risk — prepare now:";
    case "YELLOW":
      return "Worth monitoring:";
    default:
      return "Standing guidance:";
  }
}
