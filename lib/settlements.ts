import settlementsData from "./settlements-data.json";

// Real place data from OpenStreetMap (Overpass API), filtered to points
// inside Sierra Leone via point-in-polygon against the geoBoundaries district
// polygons, then assigned to the nearest of the 16 modern districts. Built
// once by scripts/build-settlements.mjs — see that file for the pipeline.
export type SettlementType = "CITY" | "TOWN" | "AREA";

export interface SettlementSeed {
  id: string;
  name: string;
  type: SettlementType;
  districtId: string;
  lat: number;
  lon: number;
  population: number | null;
}

export const SETTLEMENTS: SettlementSeed[] = settlementsData as SettlementSeed[];

export function settlementsForDistrict(districtId: string): SettlementSeed[] {
  return SETTLEMENTS.filter((s) => s.districtId === districtId);
}

export const SETTLEMENT_TYPE_LABELS: Record<SettlementType, string> = {
  CITY: "City",
  TOWN: "Town",
  AREA: "Area / Neighbourhood",
};
