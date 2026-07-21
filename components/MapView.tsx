"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, LayersControl, LayerGroup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { RISK_LEVEL_META, scoreToLevel } from "@/lib/hazards";
import { SATELLITE_LAYERS, gibsTileUrl } from "@/lib/satellite";
import type { DistrictWithRisk } from "@/lib/types";

const BOUNDARY_STYLE = {
  color: "#78716c",
  weight: 1,
  fillOpacity: 0,
  opacity: 0.5,
};

function radiusForPopulation(pop: number): number {
  // sqrt scale keeps Freetown's ~1.06M from swamping small districts on map.
  return Math.max(8, Math.min(34, Math.sqrt(pop) / 22));
}

interface SettlementPoint {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  overallRisk: number;
}

export function MapView({ districts }: { districts: DistrictWithRisk[] }) {
  const [boundaries, setBoundaries] = useState<GeoJSON.FeatureCollection | null>(null);
  const [settlements, setSettlements] = useState<SettlementPoint[]>([]);
  const today = new Date();

  useEffect(() => {
    fetch("/data/sl-districts.geojson")
      .then((r) => r.json())
      .then(setBoundaries)
      .catch(() => setBoundaries(null));
    fetch("/api/settlements")
      .then((r) => r.json())
      .then((all: SettlementPoint[]) => setSettlements(all.filter((s) => s.type !== "AREA")))
      .catch(() => setSettlements([]));
  }, []);

  return (
    <MapContainer
      center={[8.46, -11.8]}
      zoom={8}
      scrollWheelZoom={false}
      className="h-full w-full"
      style={{ background: "#dbeafe" }}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Street map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        {SATELLITE_LAYERS.map((layer) => (
          <LayersControl.BaseLayer key={layer.id} name={`\u{1F6F0}️ ${layer.label}`}>
            <TileLayer
              attribution='Imagery: NASA GIBS / MODIS &amp; GPM IMERG'
              url={gibsTileUrl(layer, today)}
              maxNativeZoom={layer.maxNativeZoom}
              maxZoom={12}
              tileSize={256}
            />
          </LayersControl.BaseLayer>
        ))}

        <LayersControl.Overlay checked name="District boundaries">
          <GeoJSON
            data={boundaries ?? { type: "FeatureCollection", features: [] }}
            style={BOUNDARY_STYLE}
            interactive={false}
          />
        </LayersControl.Overlay>

        <LayersControl.Overlay name="Cities &amp; towns">
          <LayerGroup>
            {settlements.map((s) => {
              const level = scoreToLevel(s.overallRisk);
              const meta = RISK_LEVEL_META[level];
              return (
                <CircleMarker
                  key={s.id}
                  center={[s.lat, s.lon]}
                  radius={s.type === "CITY" ? 6 : 4}
                  pathOptions={{ color: meta.color, fillColor: meta.color, fillOpacity: 0.75, weight: 1.5 }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-stone-500">{s.type === "CITY" ? "City" : "Town"}</p>
                      <p className="mt-1">
                        Flood/drought risk: <strong>{Math.round(s.overallRisk)}/100</strong> ({meta.label})
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </LayerGroup>
        </LayersControl.Overlay>
      </LayersControl>

      {districts.map((d) => {
        const level = scoreToLevel(d.overallRisk);
        const meta = RISK_LEVEL_META[level];
        return (
          <CircleMarker
            key={d.id}
            center={[d.lat, d.lon]}
            radius={radiusForPopulation(d.population)}
            pathOptions={{
              color: meta.color,
              fillColor: meta.color,
              fillOpacity: 0.55,
              weight: 2,
            }}
          >
            <Popup>
              <div className="min-w-[180px] text-sm">
                <p className="font-semibold">{d.name}</p>
                <p className="text-stone-500">
                  {d.province} · pop. {d.population.toLocaleString()}
                </p>
                <p className="mt-1">
                  Overall risk: <strong>{Math.round(d.overallRisk)}/100</strong> ({meta.label})
                </p>
                <a
                  href={`/districts/${d.id}`}
                  className="mt-1 inline-block text-blue-600 underline"
                >
                  View full breakdown →
                </a>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
