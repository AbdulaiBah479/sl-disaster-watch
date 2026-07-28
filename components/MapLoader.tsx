"use client";

import dynamic from "next/dynamic";
import type { DistrictWithRisk } from "@/lib/types";
import type { FlyTarget } from "@/components/MapFlyTo";

const MapView = dynamic(() => import("./MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-stone-400">
      Loading map…
    </div>
  ),
});

export function MapLoader({
  districts,
  enableScrollZoom = false,
  initialFocus = null,
}: {
  districts: DistrictWithRisk[];
  enableScrollZoom?: boolean;
  initialFocus?: FlyTarget | null;
}) {
  return <MapView districts={districts} enableScrollZoom={enableScrollZoom} initialFocus={initialFocus} />;
}
