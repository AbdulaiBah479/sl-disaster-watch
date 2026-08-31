"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "unsupported" | "loading" | "off" | "on";

// Registers public/sw.js, subscribes via the browser's PushManager using the
// app's VAPID public key, and posts the subscription to /api/push/subscribe.
// lib/push.ts (server side) sends a notification here whenever the risk
// engine creates a new or escalated Alert — see syncAlerts() in riskEngine.ts.
//
// Starts as "loading" on both server and client so the first paint matches
// (no hydration mismatch); the real status is only known client-side, so it
// resolves in an effect. eslint-disable is for the synchronous branch below —
// this is a one-time capability check on mount, not a state-sync loop.
export function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("unsupported");
      return;
    }
    let cancelled = false;
    navigator.serviceWorker.register("/sw.js").then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        if (!cancelled) setStatus(sub ? "on" : "off");
      }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    setStatus("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      setStatus("on");
    } catch {
      setStatus("off");
    }
  }

  async function disable() {
    setStatus("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch {
      setStatus("on");
    }
  }

  if (status === "unsupported" || status === "loading") return null;

  return (
    <button
      onClick={status === "on" ? disable : enable}
      aria-label={status === "on" ? "Disable alert notifications" : "Enable alert notifications"}
      title={
        status === "on"
          ? "Alert notifications on — click to turn off"
          : "Get notified when a new Warning/Critical alert is issued"
      }
      className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:bg-black/5 dark:hover:bg-white/10"
    >
      {status === "on" ? "🔕" : "🛎️"}
      <span className="sr-only">{status === "on" ? "Disable" : "Enable"} alert notifications</span>
    </button>
  );
}
