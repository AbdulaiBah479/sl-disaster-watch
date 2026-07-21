// Knowledge-based seasonal baselines for hazards that have no live public
// feed at district resolution: human/animal epidemiology and crop pests.
// These are explicitly modeled estimates (documented in the README), not
// live telemetry — they combine known Sierra Leone disease ecology and
// agricultural calendars with the current month, then get topped up by any
// live ReliefWeb signal for the epidemic categories.
import { DISTRICTS } from "@/lib/districts";
import { clamp } from "@/lib/geo";
import type { SignalCandidate, SourceResult } from "./types";

// Kenema, Kailahun and Kono form the historically documented "Lassa fever
// belt" of Eastern Province (Kenema Government Hospital Lassa ward).
const LASSA_BELT = new Set(["kenema", "kailahun", "kono"]);
const HIGH_DENSITY_CHOLERA_RISK = new Set(["western_urban", "western_rural", "port_loko"]);

function isDrySeason(month: number): boolean {
  return [11, 0, 1, 2, 3].includes(month); // Dec-Apr
}
function isRainySeason(month: number): boolean {
  return [5, 6, 7, 8, 9].includes(month); // Jun-Oct
}

export function computeEpidemicHumanBaseline(): SourceResult {
  const month = new Date().getMonth();
  const signals: SignalCandidate[] = DISTRICTS.map((d) => {
    let value = 8;
    const notes: string[] = [];

    if (LASSA_BELT.has(d.id) && isDrySeason(month)) {
      value += 30;
      notes.push("Lassa fever belt, dry-season rodent transmission peak");
    } else if (LASSA_BELT.has(d.id)) {
      value += 12;
      notes.push("Lassa fever endemic area (off-peak season)");
    }

    if (HIGH_DENSITY_CHOLERA_RISK.has(d.id) && isRainySeason(month)) {
      value += 25;
      notes.push("Dense settlements + rainy-season WASH/cholera risk");
    }

    return {
      districtId: d.id,
      category: "EPIDEMIC_HUMAN" as const,
      source: "MODEL_BASELINE",
      value: clamp(value, 0, 100),
      unit: "seasonal epidemiology baseline",
      summary: notes.length
        ? notes.join("; ")
        : "Background endemic disease baseline, no elevated seasonal factor",
      metadata: { month },
      observedAt: new Date(),
    };
  });

  return { source: "MODEL_BASELINE_EPI_HUMAN", signals, itemsFetched: signals.length, status: "success" };
}

export function computeEpidemicAnimalBaseline(): SourceResult {
  const signals: SignalCandidate[] = DISTRICTS.filter((d) => d.livestockPresent).map((d) => ({
    districtId: d.id,
    category: "EPIDEMIC_ANIMAL" as const,
    source: "MODEL_BASELINE",
    value: 18,
    unit: "endemic disease baseline",
    summary:
      "African swine fever endemic nationally since first confirmed 2020 outbreak; foot-and-mouth disease notified 2018 (WOAH/WAHIS)",
    metadata: {},
    observedAt: new Date(),
  }));

  return { source: "MODEL_BASELINE_EPI_ANIMAL", signals, itemsFetched: signals.length, status: "success" };
}

export function computeCropPestDiseaseBaseline(): SourceResult {
  const month = new Date().getMonth();
  const signals: SignalCandidate[] = DISTRICTS.map((d) => {
    const crops = d.primaryCrops;
    if (crops.length === 0) {
      return {
        districtId: d.id,
        category: "CROP_PEST_DISEASE" as const,
        source: "MODEL_BASELINE",
        value: 0,
        unit: "seasonal agromet baseline",
        summary: "Not a significant agricultural district",
        metadata: {},
        observedAt: new Date(),
      };
    }

    let value = 10;
    const notes: string[] = [];

    const growsRice = crops.some((c) => c.includes("rice"));
    const growsCassava = crops.includes("cassava");
    const growsCacao = crops.some((c) => c === "cocoa" || c === "coffee");
    const growsMaizeLike = growsCassava || growsRice;

    if (growsRice && isRainySeason(month)) {
      value += 25;
      notes.push("Rice blast risk elevated by rainy-season humidity");
    }
    if (growsCassava) {
      value += 10;
      notes.push("Cassava mosaic disease endemic background risk");
    }
    if (growsCacao && isRainySeason(month)) {
      value += 22;
      notes.push("Black pod disease (Phytophthora) risk in cocoa/coffee during rains");
    }
    if (growsMaizeLike && isDrySeason(month)) {
      value += 15;
      notes.push("Fall armyworm outbreak risk during dry-spell planting windows");
    }

    return {
      districtId: d.id,
      category: "CROP_PEST_DISEASE" as const,
      source: "MODEL_BASELINE",
      value: clamp(value, 0, 100),
      unit: "seasonal agromet baseline",
      summary: notes.length ? notes.join("; ") : "Low background pest/disease pressure",
      metadata: { month, crops },
      observedAt: new Date(),
    };
  });

  return { source: "MODEL_BASELINE_CROP", signals, itemsFetched: signals.length, status: "success" };
}
