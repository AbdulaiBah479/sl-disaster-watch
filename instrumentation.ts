// Self-refresh scheduler: complements .github/workflows/ingest-cron.yml.
//
// GitHub Actions covers Netlify, since Netlify Functions are stateless and
// don't run a persistent process for setInterval to fire in. This scheduler
// is what actually keeps data fresh on any deployment that DOES run a
// persistent Node server — self-hosted (`next start` on a VM/Docker/Fly.io/
// Railway/Render), and `next dev` locally. Both triggers share the same
// runIngestionIfDue() gate in lib/ingest.ts, so they can never double up.
//
// register() must return before the server starts serving requests, so this
// only arms the interval — it never awaits the ingestion itself.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const globalForScheduler = globalThis as unknown as { ingestScheduler?: NodeJS.Timeout };
  if (globalForScheduler.ingestScheduler) return; // survive Next dev's module re-evaluation

  const intervalMinutes = Number(process.env.INGEST_AUTO_INTERVAL_MINUTES ?? 15);

  globalForScheduler.ingestScheduler = setInterval(async () => {
    try {
      const { runIngestionIfDue } = await import("@/lib/ingest");
      const result = await runIngestionIfDue();
      if ("skipped" in result) {
        console.log(`[ingest-scheduler] skipped: ${result.reason}`);
      } else {
        console.log(
          `[ingest-scheduler] ran: ${result.totalSignals} signals, ${result.totalRiskScores} risk scores`,
        );
      }
    } catch (err) {
      console.error("[ingest-scheduler] failed:", err);
    }
  }, intervalMinutes * 60_000);
}
