"use client";

import { useEffect, useState } from "react";
import { HAZARD_LIST } from "@/lib/hazards";

interface Report {
  id: string;
  description: string;
  category: string;
  reporterName?: string | null;
  contact?: string | null;
  status: "PENDING" | "VERIFIED" | "DISMISSED";
  createdAt: string;
  district: { name: string };
  settlement?: { name: string } | null;
}

export default function AdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      const url = filter === "PENDING" ? "/api/reports?status=PENDING" : "/api/reports";
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (!cancelled) setReports(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  async function setStatus(id: string, status: "VERIFIED" | "DISMISSED") {
    setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    await fetch(`/api/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Admin — Report Moderation</h1>
        <p className="mt-1 text-sm text-muted">
          Review community incident reports submitted via the public reporting form.
        </p>
      </div>

      <div className="flex gap-2">
        {(["PENDING", "ALL"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="rounded-full border px-3 py-1.5 text-xs font-medium"
            style={{
              borderColor: filter === f ? "var(--brand-teal)" : "var(--border)",
              background: filter === f ? "var(--brand-teal)22" : "transparent",
            }}
          >
            {f === "PENDING" ? "Pending review" : "All reports"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading reports…</p>
      ) : reports.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted" style={{ borderColor: "var(--border-strong)" }}>
          Nothing to review.
        </p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => {
            const meta = HAZARD_LIST.find((h) => h.category === r.category);
            return (
              <li key={r.id} className="rounded-lg p-4 surface-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {meta?.icon} {meta?.label} — {r.settlement ? `${r.settlement.name}, ` : ""}
                    {r.district.name}
                  </span>
                  <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1.5 text-sm text-muted">{r.description}</p>
                {r.reporterName && (
                  <p className="mt-1 text-xs text-muted">
                    Reported by {r.reporterName}
                    {r.contact ? ` · ${r.contact}` : ""}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      background:
                        r.status === "VERIFIED"
                          ? "var(--status-good)22"
                          : r.status === "DISMISSED"
                            ? "var(--border)"
                            : "var(--status-warning)33",
                      color: r.status === "VERIFIED" ? "var(--status-good)" : "inherit",
                    }}
                  >
                    {r.status}
                  </span>
                  {r.status !== "VERIFIED" && (
                    <button
                      onClick={() => setStatus(r.id, "VERIFIED")}
                      className="rounded-md px-2.5 py-1 text-xs font-medium text-white"
                      style={{ background: "var(--status-good)" }}
                    >
                      Verify
                    </button>
                  )}
                  {r.status !== "DISMISSED" && (
                    <button
                      onClick={() => setStatus(r.id, "DISMISSED")}
                      className="rounded-md border px-2.5 py-1 text-xs font-medium"
                      style={{ borderColor: "var(--border-strong)" }}
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
