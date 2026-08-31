"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Marker, Popup, LayersControl, LayerGroup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import { RISK_LEVEL_META, scoreToLevel } from "@/lib/hazards";
import { SATELLITE_LAYERS, gibsTileUrl } from "@/lib/satellite";
import { Drawer } from "@/components/Drawer";
import { SatelliteSnapshot } from "@/components/SatelliteSnapshot";
import { MapFlyTo, type FlyTarget } from "@/components/MapFlyTo";
import type { DistrictWithRisk } from "@/lib/types";
import { formatNumber } from "@/lib/format";

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

function dotDivIcon(color: string, diameterPx: number): L.DivIcon {
  return L.divIcon({
    html: `<span style="display:block;width:${diameterPx}px;height:${diameterPx}px;border-radius:50%;background:${color};border:1.5px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.15)"></span>`,
    className: "",
    iconSize: [diameterPx, diameterPx],
  });
}

interface SettlementPoint {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  overallRisk: number;
}

interface SnapshotTarget {
  name: string;
  lat: number;
  lon: number;
  bboxDegrees: number;
}

export function MapView({
  districts,
  enableScrollZoom = false,
  initialFocus = null,
}: {
  districts: DistrictWithRisk[];
  enableScrollZoom?: boolean;
  initialFocus?: FlyTarget | null;
}) {
  const [boundaries, setBoundaries] = useState<GeoJSON.FeatureCollection | null>(null);
  const [settlements, setSettlements] = useState<SettlementPoint[]>([]);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(initialFocus);
  const [snapshotTarget, setSnapshotTarget] = useState<SnapshotTarget | null>(null);
  const today = new Date();

  // initialFocus changes when the SearchBar navigates to /map?focus=<id>
  // while already on this page — the MapView instance isn't remounted, so
  // this effect (rather than the useState initializer alone) is what
  // actually re-triggers the flyTo for that case.
  useEffect(() => {
    if (initialFocus) setFlyTarget(initialFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFocus?.lat, initialFocus?.lon, initialFocus?.zoom]);

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
    <>
      <MapContainer
        center={[8.46, -11.8]}
        zoom={8}
        scrollWheelZoom={enableScrollZoom}
        wheelPxPerZoomLevel={enableScrollZoom ? 100 : 60}
        zoomSnap={0.5}
        zoomDelta={0.5}
        preferCanvas
        className="h-full w-full"
        style={{ background: "#dbeafe" }}
      >
        <MapFlyTo target={flyTarget} />
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
              <MarkerClusterGroup chunkedLoading maxClusterRadius={50} disableClusteringAtZoom={12}>
                {settlements.map((s) => {
                  const level = scoreToLevel(s.overallRisk);
                  const meta = RISK_LEVEL_META[level];
                  const diameter = s.type === "CITY" ? 12 : 8;
                  return (
                    <Marker
                      key={s.id}
                      position={[s.lat, s.lon]}
                      icon={dotDivIcon(meta.color, diameter)}
                      title={s.name}
                      eventHandlers={{ click: () => setFlyTarget({ lat: s.lat, lon: s.lon, zoom: 14 }) }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold">{s.name}</p>
                          <p className="text-stone-500">{s.type === "CITY" ? "City" : "Town"}</p>
                          <p className="mt-1">
                            Flood/drought risk: <strong>{Math.round(s.overallRisk)}/100</strong> ({meta.label})
                          </p>
                          <button
                            type="button"
                            className="mt-2 text-blue-600 underline"
                            onClick={() =>
                              setSnapshotTarget({ name: s.name, lat: s.lat, lon: s.lon, bboxDegrees: 0.15 })
                            }
                          >
                            🛰 Satellite snapshot
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MarkerClusterGroup>
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
              eventHandlers={{ click: () => setFlyTarget({ lat: d.lat, lon: d.lon, zoom: 13 }) }}
            >
              <Popup>
                <div className="min-w-[180px] text-sm">
                  <p className="font-semibold">{d.name}</p>
                  <p className="text-stone-500">
                    {d.province} · pop. {formatNumber(d.population)}
                  </p>
                  <p className="mt-1">
                    Overall risk: <strong>{Math.round(d.overallRisk)}/100</strong> ({meta.label})
                  </p>
                  <button
                    type="button"
                    className="mt-2 block text-blue-600 underline"
                    onClick={() => setSnapshotTarget({ name: d.name, lat: d.lat, lon: d.lon, bboxDegrees: 0.35 })}
                  >
                    🛰 Satellite snapshot
                  </button>
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

      <Drawer
        open={snapshotTarget != null}
        onClose={() => setSnapshotTarget(null)}
        title={snapshotTarget ? `${snapshotTarget.name} — Satellite Snapshot` : ""}
      >
        {snapshotTarget && (
          <SatelliteSnapshot
            label={snapshotTarget.name}
            lat={snapshotTarget.lat}
            lon={snapshotTarget.lon}
            bboxDegrees={snapshotTarget.bboxDegrees}
          />
        )}
      </Drawer>
    </>
  );
}
