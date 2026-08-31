"use client";

import { useState } from "react";
import {
  SATELLITE_LAYERS,
  gibsSnapshotUrl,
  recentSnapshotDates,
  worldviewDeepLink,
  type SatelliteLayerConfig,
} from "@/lib/satellite";
import { formatDate } from "@/lib/format";

export function SatelliteSnapshot({
  label,
  lat,
  lon,
  bboxDegrees = 0.35,
}: {
  label: string;
  lat: number;
  lon: number;
  bboxDegrees?: number;
}) {
  const [layer, setLayer] = useState<SatelliteLayerConfig>(SATELLITE_LAYERS[0]);
  const dates = recentSnapshotDates(layer);
  const [date, setDate] = useState<Date>(dates[0]);
  const [failed, setFailed] = useState(false);

  function selectLayer(next: SatelliteLayerConfig) {
    setLayer(next);
    setDate(recentSnapshotDates(next)[0]);
    setFailed(false);
  }

  function selectDate(next: Date) {
    setDate(next);
    setFailed(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Satellite layer">
        {SATELLITE_LAYERS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-pressed={l.id === layer.id}
            aria-selected={l.id === layer.id}
            onClick={() => selectLayer(l)}
            className="rounded-full px-3 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2"
            style={{
              background: l.id === layer.id ? "var(--brand-primary)" : "transparent",
              color: l.id === layer.id ? "#fff" : "var(--foreground)",
              border: "1px solid var(--border)",
            }}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div
        className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg"
        style={{ background: "#0f172a" }}
      >
        {!failed ? (
          <img
            key={`${layer.id}-${date.toISOString()}`}
            src={gibsSnapshotUrl(layer, date, { lat, lon }, { bboxDegrees })}
            alt={`${layer.label} satellite imagery over ${label}`}
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <p className="px-6 text-center text-sm text-white/70">
            No cloud-free imagery available for this date/layer — try another date.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Snapshot date">
        {dates.map((d) => (
          <button
            key={d.toISOString()}
            type="button"
            role="tab"
            aria-pressed={d.getTime() === date.getTime()}
            aria-selected={d.getTime() === date.getTime()}
            onClick={() => selectDate(d)}
            className="rounded-md px-2.5 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2"
            style={{
              background: d.getTime() === date.getTime() ? "var(--brand-primary)" : "transparent",
              color: d.getTime() === date.getTime() ? "#fff" : "var(--foreground)",
              border: "1px solid var(--border)",
            }}
          >
            {formatDate(d, { month: "short", day: "numeric" })}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted">
        {layer.description} Imagery: NASA GIBS Worldview Snapshots (
        {layer.id === "true-color" ? "MODIS Terra" : layer.id === "ndvi" ? "MODIS Terra, 8-day composite" : "GPM IMERG"}
        ).{" "}
        <a
          href={worldviewDeepLink(layer, date, { lat, lon }, bboxDegrees)}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          View in NASA Worldview ↗
        </a>
      </p>
    </div>
  );
}
