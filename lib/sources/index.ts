import { fetchUsgsEarthquakeSignals } from "./usgs";
import { fetchGdacsSignals } from "./gdacs";
import { fetchOpenMeteoWeatherSignals, type WeatherForecastDay } from "./openMeteoWeather";
import { fetchDroughtSignals } from "./openMeteoDrought";
import { fetchMarineSignals } from "./openMeteoMarine";
import { fetchAirQualitySignals } from "./openMeteoAirQuality";
import { fetchFloodDischargeSignals, type FloodForecastDay } from "./openMeteoFlood";
import { fetchFirmsSignals } from "./firms";
import { fetchReliefWebSignals } from "./reliefweb";
import { DISTRICTS } from "@/lib/districts";
import {
  computeEpidemicHumanBaseline,
  computeEpidemicAnimalBaseline,
  computeCropPestDiseaseBaseline,
} from "./modelBaseline";
import type { SourceResult } from "./types";

export interface RunAllSourcesOutput {
  results: SourceResult[];
  // Real forward-looking data (days 1-7) the prediction engine regresses
  // on — kept separate from `results`, which only carries each source's
  // current-day (day 0) signal into the live risk engine.
  floodForecastByPointId: Map<string, FloodForecastDay[]>;
  weatherForecastByDistrict: Map<string, WeatherForecastDay[]>;
}

export async function runAllSources(): Promise<RunAllSourcesOutput> {
  const [usgs, gdacs, weather, drought, marine, air, firms, reliefweb, flood] = await Promise.all([
    fetchUsgsEarthquakeSignals(),
    fetchGdacsSignals(),
    fetchOpenMeteoWeatherSignals(),
    fetchDroughtSignals(),
    fetchMarineSignals(),
    fetchAirQualitySignals(),
    fetchFirmsSignals(),
    fetchReliefWebSignals(),
    fetchFloodDischargeSignals(DISTRICTS.map((d) => ({ id: d.id, lat: d.lat, lon: d.lon }))),
  ]);

  const modelResults = [
    computeEpidemicHumanBaseline(),
    computeEpidemicAnimalBaseline(),
    computeCropPestDiseaseBaseline(),
  ];

  return {
    results: [usgs, gdacs, weather.result, drought, marine, air, firms, reliefweb, flood.result, ...modelResults],
    floodForecastByPointId: flood.forecastByPointId,
    weatherForecastByDistrict: weather.weatherForecastByDistrict,
  };
}

export type { SourceResult, SignalCandidate } from "./types";
export type { WeatherForecastDay } from "./openMeteoWeather";
export type { FloodForecastDay } from "./openMeteoFlood";
