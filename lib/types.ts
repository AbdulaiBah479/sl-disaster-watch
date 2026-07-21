import type { LatestRiskScore } from "@/lib/queries";
import type { LandslideRisk } from "@/lib/districts";

export interface DistrictWithRisk {
  id: string;
  name: string;
  province: string;
  capital: string;
  areaKm2: number;
  population: number;
  lat: number;
  lon: number;
  coastal: boolean;
  riverine: boolean;
  landslideRisk: LandslideRisk | string;
  vulnerabilityIndex: number;
  primaryCrops: string[];
  livestockPresent: boolean;
  overallRisk: number;
  riskScores: LatestRiskScore[];
}
