import type { HazardCategory } from "@/lib/hazards";

export type AgencyType = "coordinator" | "national" | "international_partner";

export interface Agency {
  id: string;
  name: string;
  acronym?: string;
  type: AgencyType;
  mandate: string;
  hazardCategories: HazardCategory[] | "ALL";
  website?: string;
  phone?: string;
  facebook?: string;
  address?: string;
  established?: string;
  sourceUrl: string;
}

// Real Sierra Leone disaster-management agencies and the international/technical
// partners already cited elsewhere in this app (lib/recommendations.ts,
// README's Data sources table). Every fact here — mandate, founding act,
// hotline, website — is traced to a public source (see sourceUrl); nothing
// is invented, in keeping with this project's overall approach. Contact
// details are omitted rather than guessed wherever a search didn't turn up
// a confirmed figure.
export const AGENCIES: Agency[] = [
  {
    id: "ndma",
    name: "National Disaster Management Agency",
    acronym: "NDMA",
    type: "coordinator",
    mandate:
      "Sierra Leone's lead all-hazards disaster management body, established by Act of Parliament and launched in November 2020 in the wake of the 2017 Regent mudslide. Coordinates national, regional, district and chiefdom disaster management committees and manages the National Disaster Management Fund.",
    hazardCategories: "ALL",
    website: "https://ndma.gov.sl",
    phone: "1199 (Africell toll-free public reporting line)",
    facebook: "https://www.facebook.com/p/National-Disaster-Management-Agency-Sierra-Leone-100071363691472/",
    established: "2020",
    sourceUrl: "https://www.thesierraleonetelegraph.com/sierra-leone-now-has-a-dedicated-national-disaster-management-agency/",
  },
  {
    id: "ons",
    name: "Office of National Security — Disaster Management Department",
    acronym: "ONS-DMD",
    type: "coordinator",
    mandate:
      "Runs the National Situation Room and coordinates the Early Warning and Early Response (EWER) mechanism across the national security architecture, complementing sector-specific response centers (e.g. past Ebola and COVID-19 response coordination).",
    hazardCategories: "ALL",
    website: "https://ons.gov.sl",
    phone: "119 (national emergency line)",
    sourceUrl: "https://ons.gov.sl/national-situation-room/",
  },
  {
    id: "slmet",
    name: "Sierra Leone Meteorological Agency",
    acronym: "SLMet",
    type: "national",
    mandate:
      "Sierra Leone's official weather and climate authority, established by the SLMet Act No. 8 of 2017 (amended 2022). Issues forecasts, severe-weather warnings and climate advisories under the Ministry of Transport and Aviation.",
    hazardCategories: ["STORM_WIND", "FLOOD_RIVER", "FLOOD_COASTAL", "DROUGHT", "AIR_QUALITY", "MARINE_HAZARD"],
    website: "https://slmet.gov.sl",
    established: "2017",
    sourceUrl: "https://slmet.gov.sl/",
  },
  {
    id: "slrcs",
    name: "Sierra Leone Red Cross Society",
    acronym: "SLRCS",
    type: "national",
    mandate:
      "Auxiliary to government under the 1962 Act of Parliament establishing it; part of the IFRC network. Runs community-based disaster response, first aid and blood services nationwide, often first on the ground in flood- and landslide-affected communities.",
    hazardCategories: ["FLOOD_RIVER", "FLOOD_COASTAL", "LANDSLIDE", "EPIDEMIC_HUMAN"],
    website: "https://sierraleoneredcross.org",
    established: "1962",
    sourceUrl: "https://sierraleoneredcross.org/",
  },
  {
    id: "npha",
    name: "National Public Health Agency",
    acronym: "NPHA",
    type: "national",
    mandate:
      "Launched December 2023 as Sierra Leone's central coordinating structure for public health, disease surveillance and outbreak response — runs the electronic Integrated Disease Surveillance and Response (IDSR) and case-based (eCBDS) systems.",
    hazardCategories: ["EPIDEMIC_HUMAN"],
    website: "https://npha.gov.sl",
    established: "2023",
    sourceUrl: "https://reliefweb.int/report/sierra-leone/sierra-leone-launches-national-public-health-agency-strengthen-healthcare-infrastructure",
  },
  {
    id: "epa-sl",
    name: "Environment Protection Agency Sierra Leone",
    acronym: "EPA-SL",
    type: "national",
    mandate:
      "Regulatory agency for environmental protection and management under the EPA Act 2008 — oversees environmental-impact licensing and advises the Minister of Environment and Climate Change, including on coastal and wildfire-adjacent land-use matters.",
    hazardCategories: ["FLOOD_COASTAL", "WILDFIRE", "AIR_QUALITY", "MARINE_HAZARD"],
    website: "https://epa.gov.sl",
    phone: "+232-88-908-951",
    address: "38 Freetown Road, Wilberforce Village, Freetown",
    established: "2008",
    sourceUrl: "https://epa.gov.sl/contact/",
  },
  {
    id: "mafs",
    name: "Ministry of Agriculture and Food Security",
    acronym: "MAFS",
    type: "national",
    mandate:
      "Government ministry for agricultural growth and food security; its Livestock and Veterinary Services division handles animal-disease outbreaks and its Forestry Division shares wildfire/bush-burning oversight with EPA-SL.",
    hazardCategories: ["DROUGHT", "CROP_PEST_DISEASE", "EPIDEMIC_ANIMAL", "WILDFIRE"],
    website: "https://maf.gov.sl",
    phone: "+232 78 792370",
    sourceUrl: "https://maf.gov.sl/contact-us/",
  },
  {
    id: "fcc",
    name: "Freetown City Council",
    acronym: "FCC",
    type: "national",
    mandate:
      "Municipal authority for the capital; runs the post-2017-mudslide Transform Freetown resilience strategy and the \"Freetown the Treetown\" reforestation program targeting landslide-prone hillside communities on the Freetown Peninsula.",
    hazardCategories: ["LANDSLIDE", "FLOOD_COASTAL"],
    sourceUrl: "https://www.gfdrr.org/en/feature-story/informing-resilient-recovery-policy-planning-and-investments-freetown-sierra-leone",
  },
  {
    id: "slmarad",
    name: "Sierra Leone Maritime Administration",
    acronym: "SLMarAd",
    type: "national",
    mandate:
      "Autonomous body established by the Sierra Leone Maritime Administration Act, 2000 — registers vessels, certifies seafarers and regulates coastal/inland water transport safety, including rough-sea and storm-surge advisories.",
    hazardCategories: ["MARINE_HAZARD", "TSUNAMI"],
    website: "https://slmarad.com",
    established: "2000",
    sourceUrl: "https://slmarad.com/",
  },
  {
    id: "edsa",
    name: "Electricity Distribution and Supply Authority",
    acronym: "EDSA",
    type: "national",
    mandate:
      "National electricity distributor, formed in 2014 from the unbundling of the National Power Authority — responsible for grid resilience and outage response when storms/high winds bring down power infrastructure.",
    hazardCategories: ["STORM_WIND"],
    website: "https://edsa.sl",
    established: "2014",
    sourceUrl: "https://www.devex.com/organizations/electricity-distribution-and-supply-authority-edsa-sierra-leone-128034",
  },
  {
    id: "slcaa",
    name: "Sierra Leone Civil Aviation Authority",
    acronym: "SLCAA",
    type: "national",
    mandate:
      "Established 2008 — regulates domestic and international air transport, including visibility/safety guidance during Harmattan dust events.",
    hazardCategories: ["AIR_QUALITY"],
    website: "https://slcaa.gov.sl",
    established: "2008",
    sourceUrl: "https://slcaa.gov.sl/",
  },

  // International & technical partners — global bodies this app already
  // cites as data sources (README) or coordinating bodies (lib/recommendations.ts).
  {
    id: "who-sl",
    name: "World Health Organization — Sierra Leone",
    acronym: "WHO",
    type: "international_partner",
    mandate: "UN health agency; supports outbreak surveillance, response coordination and health-system strengthening.",
    hazardCategories: ["EPIDEMIC_HUMAN"],
    website: "https://www.who.int/countries/sle",
    sourceUrl: "https://www.who.int/countries/sle",
  },
  {
    id: "africa-cdc",
    name: "Africa Centres for Disease Control and Prevention",
    acronym: "Africa CDC",
    type: "international_partner",
    mandate: "African Union public health agency; coordinated the continental mpox response Sierra Leone was the epicenter of in 2025.",
    hazardCategories: ["EPIDEMIC_HUMAN"],
    website: "https://africacdc.org",
    sourceUrl: "https://africacdc.org",
  },
  {
    id: "fao-sl",
    name: "Food and Agriculture Organization — Sierra Leone",
    acronym: "FAO",
    type: "international_partner",
    mandate: "UN agency supporting crop-pest early warning, extension services and agricultural resilience programs.",
    hazardCategories: ["CROP_PEST_DISEASE"],
    website: "https://www.fao.org/sierra-leone",
    sourceUrl: "https://www.fao.org/sierra-leone",
  },
  {
    id: "wfp-sl",
    name: "World Food Programme — Sierra Leone",
    acronym: "WFP",
    type: "international_partner",
    mandate: "UN agency running food-security monitoring and drought-response assistance programs.",
    hazardCategories: ["DROUGHT"],
    website: "https://www.wfp.org/countries/sierra-leone",
    sourceUrl: "https://www.wfp.org/countries/sierra-leone",
  },
  {
    id: "fews-net",
    name: "Famine Early Warning Systems Network",
    acronym: "FEWS NET",
    type: "international_partner",
    mandate: "USAID-funded early-warning network for food-security and drought monitoring — this app's DROUGHT model follows the same rainfall-anomaly approach.",
    hazardCategories: ["DROUGHT"],
    website: "https://fews.net",
    sourceUrl: "https://fews.net",
  },
  {
    id: "woah",
    name: "World Organisation for Animal Health",
    acronym: "WOAH (ex-OIE)",
    type: "international_partner",
    mandate: "International animal-health standards body; Sierra Leone reports livestock disease outbreaks (African swine fever, foot-and-mouth) to WAHIS.",
    hazardCategories: ["EPIDEMIC_ANIMAL"],
    website: "https://www.woah.org",
    sourceUrl: "https://www.woah.org",
  },
  {
    id: "noaa-ptwc",
    name: "NOAA Pacific Tsunami Warning Center",
    acronym: "PTWC",
    type: "international_partner",
    mandate: "Authoritative source for tsunami warnings — this dashboard's TSUNAMI category is a derived estimate and defers to PTWC/GDACS directly.",
    hazardCategories: ["TSUNAMI"],
    website: "https://www.tsunami.gov",
    sourceUrl: "https://www.tsunami.gov",
  },
  {
    id: "gdacs",
    name: "Global Disaster Alert and Coordination System",
    acronym: "GDACS",
    type: "international_partner",
    mandate: "UN/EC-backed multi-hazard alert system — one of this app's core live data sources for earthquake, flood, drought, wildfire and storm signals.",
    hazardCategories: "ALL",
    website: "https://www.gdacs.org",
    sourceUrl: "https://www.gdacs.org",
  },
];

export function findAgency(id: string): Agency | undefined {
  return AGENCIES.find((a) => a.id === id);
}

export function agenciesForHazard(category: HazardCategory): Agency[] {
  return AGENCIES.filter((a) => a.hazardCategories === "ALL" || a.hazardCategories.includes(category));
}
