"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertList } from "@/components/AlertList";
import { HAZARD_LIST, RISK_LEVEL_META, type HazardCategory, type RiskLevel } from "@/lib/hazards";

interface AlertItem {
  id: string;
  districtId: string;
  settlementId?: string | null;
  category: HazardCategory;
  level: RiskLevel;
  title: string;
  message: string;
  issuedAt: string;
  official?: boolean;
  district: { name: string };
  settlement?: { name: string } | null;
}

interface SessionUser {
  role: "ADMIN" | "REVIEWER" | "DISTRICT_OFFICER";
  districtId: string | null;
}

const LEVELS: RiskLevel[] = ["RED", "ORANGE", "YELLOW", "GREEN"];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<RiskLevel | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch("/api/alerts")
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) setAlerts(data);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 90_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  async function toggleOfficial(id: string, official: boolean) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, official } : a)));
    await fetch(`/api/alerts/${id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ official }),
    });
  }

  const filtered = useMemo(
    () =>
      alerts.filter(
        (a) =>
          (levelFilter === "ALL" || a.level === levelFilter) &&
          (categoryFilter === "ALL" || a.category === categoryFilter),
      ),
    [alerts, levelFilter, categoryFilter],
  );

  const counts = LEVELS.reduce<Record<RiskLevel, number>>(
    (acc, l) => ({ ...acc, [l]: alerts.filter((a) => a.level === l).length }),
    { RED: 0, ORANGE: 0, YELLOW: 0, GREEN: 0 },
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="mt-1 text-sm text-muted">
          Every active Warning/Critical signal across all districts, cities, towns and areas.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevelFilter(levelFilter === l ? "ALL" : l)}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition"
            style={{
              borderColor: levelFilter === l ? RISK_LEVEL_META[l].color : "var(--border)",
              background: levelFilter === l ? `${RISK_LEVEL_META[l].color}22` : "transparent",
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: RISK_LEVEL_META[l].color }} />
            {RISK_LEVEL_META[l].label} ({counts[l]})
          </button>
        ))}
      </div>

      <select
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        className="w-full max-w-xs rounded-lg border px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <option value="ALL">All hazard categories</option>
        {HAZARD_LIST.map((h) => (
          <option key={h.category} value={h.category}>
            {h.icon} {h.label}
          </option>
        ))}
      </select>

      {loading ? (
        <p className="text-sm text-muted">Loading alerts…</p>
      ) : (
        <AlertList
          alerts={filtered}
          onToggleOfficial={user ? toggleOfficial : undefined}
          canModerate={(a) => user?.role !== "DISTRICT_OFFICER" || a.districtId === user.districtId}
        />
      )}
    </div>
  );
}
