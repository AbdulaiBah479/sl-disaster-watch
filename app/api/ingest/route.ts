import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingest";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MIN_INTERVAL_MINUTES = Number(process.env.INGEST_MIN_INTERVAL_MINUTES ?? 10);

// Pulls fresh data from every configured source, persists normalized hazard
// signals, recomputes composite risk scores, and syncs alerts. Triggered by
// the dashboard's "Refresh data" button and by the scheduled GitHub Actions
// workflow (.github/workflows/ingest-cron.yml) — see README. Guarded by a
// minimum interval so an overlapping manual click + cron tick can't double
// up requests against the free external APIs.
export async function POST() {
  const lastRun = await prisma.ingestionRun.findFirst({
    orderBy: { startedAt: "desc" },
  });
  if (lastRun) {
    const minutesSince = (Date.now() - lastRun.startedAt.getTime()) / 60_000;
    if (minutesSince < MIN_INTERVAL_MINUTES) {
      return NextResponse.json(
        {
          skipped: true,
          reason: `Last ingestion ran ${minutesSince.toFixed(1)} min ago; minimum interval is ${MIN_INTERVAL_MINUTES} min.`,
        },
        { status: 200 },
      );
    }
  }

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
