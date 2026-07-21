"use client";

import { useEffect, useState } from "react";

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    // Deferred so the initial update happens inside a callback rather than
    // synchronously in the effect body (also sidesteps SSR/client clock
    // hydration mismatch — first paint renders nothing, then the real time).
    const initial = setTimeout(update, 0);
    const interval = setInterval(update, 30_000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  if (!now) return null;

  return (
    <div className="hidden items-center gap-1.5 text-xs text-muted md:flex">
      <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: "var(--status-good)" }} />
      {now.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}
    </div>
  );
}
