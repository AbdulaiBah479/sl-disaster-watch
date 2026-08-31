"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface IngestSummary {
  totalSignals: number;
  totalRiskScores: number;
  sources: { source: string; status: string; itemsFetched: number }[];
}

interface IngestSkipped {
  skipped: true;
  reason: string;
}

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<IngestSummary | null>(null);
  const [skipped, setSkipped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRefresh() {
    setLoading(true);
    setError(null);
    setSkipped(null);
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      if (!res.ok) throw new Error(`Ingestion failed (${res.status})`);
      const data = (await res.json()) as IngestSummary | IngestSkipped;
      if ("skipped" in data) {
        setSkipped(data.reason);
        setSummary(null);
      } else {
        setSummary(data);
        startTransition(() => router.refresh());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || isPending;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRefresh}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
      >
        {busy ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-stone-900/30 dark:border-t-stone-900" />
            Pulling live data…
          </>
        ) : (
          <>↻ Refresh live data</>
        )}
      </button>
      {summary && !busy && (
        <p className="text-right text-xs text-stone-500">
          {summary.totalSignals} signals from {summary.sources.length} sources → {summary.totalRiskScores} risk scores updated
        </p>
      )}
      {skipped && !busy && <p className="text-right text-xs text-stone-500">{skipped}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
