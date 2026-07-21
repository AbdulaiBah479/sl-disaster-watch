import type { HazardCategory } from "@/lib/hazards";

// Normalized output every source module produces, ready to persist as a
// HazardSignal row. `value` is always pre-normalized to a 0-100 intensity
// contribution so the risk engine can blend across heterogeneous sources.
export interface SignalCandidate {
  districtId: string;
  category: HazardCategory;
  source: string;
  value: number;
  unit?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  observedAt: Date;
}

export interface SourceResult {
  source: string;
  signals: SignalCandidate[];
  itemsFetched: number;
  status: "success" | "partial" | "error";
  message?: string;
}

// Never throw out of a source fetcher — ingestion must keep going even if
// one upstream API is down or rate-limited.
export async function safeFetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": "sl-disaster-watch (contact: portfolio-demo)",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`${url} responded ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}
