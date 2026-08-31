import { NextResponse } from "next/server";
import { runIngestionIfDue } from "@/lib/ingest";

export const dynamic = "force-dynamic";

// Pulls fresh data from every configured source, persists normalized hazard
// signals, recomputes composite risk scores, and syncs alerts. Triggered by
// the dashboard's "Refresh data" button, the scheduled GitHub Actions
// workflow (.github/workflows/ingest-cron.yml), and the in-process scheduler
// (instrumentation.ts) on any deployment that runs a persistent server — see
// README. runIngestionIfDue() shares one minimum-interval guard across all
// three so overlapping triggers can't double up against the free external APIs.
export async function POST() {
  try {
    const result = await runIngestionIfDue();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function GET() {
  return POST();
}
