import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingest";

export const dynamic = "force-dynamic";

// Pulls fresh data from every configured source, persists normalized hazard
// signals, recomputes composite risk scores, and syncs alerts. Trigger this
// from the dashboard's "Refresh data" button, or wire it to a scheduler
// (Vercel Cron / GitHub Actions) for continuous operation — see README.
export async function POST() {
  try {
    const summary = await runIngestion();
    return NextResponse.json(summary);
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
