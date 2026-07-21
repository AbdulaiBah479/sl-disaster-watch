"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RISK_LEVEL_META, type RiskLevel } from "@/lib/hazards";

interface AlertItem {
  id: string;
  title: string;
  message: string;
  level: RiskLevel;
  districtId: string;
  issuedAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then(setAlerts)
      .catch(() => setAlerts([]));
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const criticalCount = alerts.filter((a) => a.level === "RED").length;
  const totalCount = alerts.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications: ${totalCount} active alerts`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:bg-black/5 dark:hover:bg-white/10"
      >
        🔔
        {totalCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
            style={{ background: criticalCount > 0 ? "var(--status-critical)" : "var(--status-serious)" }}
          >
            {totalCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl shadow-lg surface-card"
          role="menu"
        >
          <div className="border-b px-4 py-3 text-sm font-semibold" style={{ borderColor: "var(--border)" }}>
            Active alerts ({totalCount})
          </div>
          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted">No active Warning/Critical alerts.</p>
            )}
            {alerts.slice(0, 8).map((a) => (
              <Link
                key={a.id}
                href={`/districts/${a.districtId}`}
                onClick={() => setOpen(false)}
                className="flex items-start gap-2 px-4 py-3 text-sm transition hover:bg-black/[.03] dark:hover:bg-white/[.05]"
              >
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: RISK_LEVEL_META[a.level].color }}
                />
                <span>
                  <span className="block font-medium">{a.title}</span>
                  <span className="block text-xs text-muted">{a.message}</span>
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/alerts"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-center text-sm font-medium"
            style={{ color: "var(--brand-teal)" }}
          >
            View all alerts →
          </Link>
        </div>
      )}
    </div>
  );
}
