"use client";

import dynamic from "next/dynamic";
import type { DistrictWithRisk } from "@/lib/types";

const MapView = dynamic(() => import("./MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-stone-400">
      Loading map…
    </div>
  ),
});

export function MapLoader({ districts }: { districts: DistrictWithRisk[] }) {
  return <MapView districts={districts} />;
}
