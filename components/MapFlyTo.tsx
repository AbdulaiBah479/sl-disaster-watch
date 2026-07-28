"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

export interface FlyTarget {
  lat: number;
  lon: number;
  zoom?: number;
}

// Lives inside <MapContainer> (needs the useMap() context) so marker
// clicks, search selection and ?focus= deep links can glide the map to a
// point instead of jump-cutting it.
export function MapFlyTo({ target }: { target: FlyTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lon], target.zoom ?? 13, {
      duration: 1.1,
      easeLinearity: 0.25,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.lat, target?.lon, target?.zoom]);

  return null;
}
