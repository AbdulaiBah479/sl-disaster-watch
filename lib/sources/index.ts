import { fetchUsgsEarthquakeSignals } from "./usgs";
import { fetchGdacsSignals } from "./gdacs";
import { fetchOpenMeteoWeatherSignals } from "./openMeteoWeather";
import { fetchDroughtSignals } from "./openMeteoDrought";
import { fetchMarineSignals } from "./openMeteoMarine";
import { fetchAirQualitySignals } from "./openMeteoAirQuality";
import { fetchFloodDischargeSignals } from "./openMeteoFlood";
import { fetchFirmsSignals } from "./firms";
import { fetchReliefWebSignals } from "./reliefweb";
import { DISTRICTS } from "@/lib/districts";
import {
  computeEpidemicHumanBaseline,
  computeEpidemicAnimalBaseline,
  computeCropPestDiseaseBaseline,
} from "./modelBaseline";
import type { SourceResult } from "./types";

export async function runAllSources(): Promise<SourceResult[]> {
  const liveResults = await Promise.all([
    fetchUsgsEarthquakeSignals(),
    fetchGdacsSignals(),
    fetchOpenMeteoWeatherSignals(),
    fetchDroughtSignals(),
    fetchMarineSignals(),
    fetchAirQualitySignals(),
    fetchFirmsSignals(),
    fetchReliefWebSignals(),
    fetchFloodDischargeSignals(DISTRICTS.map((d) => ({ id: d.id, lat: d.lat, lon: d.lon }))).then(
      (r) => r.result,
    ),
  ]);

  const modelResults = [
    computeEpidemicHumanBaseline(),
    computeEpidemicAnimalBaseline(),
    computeCropPestDiseaseBaseline(),
  ];

  return [...liveResults, ...modelResults];
}

export type { SourceResult, SignalCandidate } from "./types";
