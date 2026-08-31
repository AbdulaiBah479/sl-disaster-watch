import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;

const configured = Boolean(publicKey && privateKey && subject);
if (configured) {
  webpush.setVapidDetails(subject!, publicKey!, privateKey!);
}

interface PushableAlert {
  districtId: string;
  title: string;
  message: string;
  level: string;
}

// Notifies every subscription scoped to the alert's district plus every
// nationwide subscription (districtId == null). Runs after syncAlerts()
// persists new/escalated Alert rows so the push payload matches what's
// already in the DB. A dead subscription (browser unsubscribed, expired)
// gets pruned on a 404/410 response rather than retried.
export async function sendPushForAlerts(alerts: PushableAlert[]): Promise<void> {
  if (!configured || alerts.length === 0) return;

  const districtIds = [...new Set(alerts.map((a) => a.districtId))];
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { OR: [{ districtId: null }, { districtId: { in: districtIds } }] },
  });
  if (subscriptions.length === 0) return;

  const staleIds: string[] = [];

  await Promise.allSettled(
    subscriptions.flatMap((sub) => {
      const relevant = alerts.filter(
        (a) => sub.districtId === null || sub.districtId === a.districtId,
      );
      return relevant.map(async (alert) => {
        const payload = JSON.stringify({
          title: alert.title,
          body: alert.message,
          level: alert.level,
        });
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) staleIds.push(sub.id);
        }
      });
    }),
  );

  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: [...new Set(staleIds)] } } });
  }
}
