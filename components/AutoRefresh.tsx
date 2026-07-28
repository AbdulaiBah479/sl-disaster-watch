"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Silently re-reads current DB state on an interval so server-rendered
// pages feel live without a manual click — this never re-triggers the
// external-API ingestion pipeline (POST /api/ingest), only router.refresh()
// against data that's already in the local SQLite database. Pauses while
// the tab is hidden and refreshes immediately on refocus.
export function AutoRefresh({ intervalMs = 90_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    function tick() {
      if (document.visibilityState === "visible") router.refresh();
    }
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, intervalMs]);

  return null;
}
