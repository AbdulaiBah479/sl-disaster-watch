"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HAZARD_LIST } from "@/lib/hazards";

interface District {
  id: string;
  name: string;
}
interface Settlement {
  id: string;
  name: string;
  type: string;
  districtId: string;
}

const inputClass =
  "w-full rounded-lg border px-3 py-2 text-sm outline-none";
const inputStyle = { borderColor: "var(--border)", background: "var(--surface)" };

export function ReportForm({ districts }: { districts: District[] }) {
  const searchParams = useSearchParams();
  const presetDistrict = searchParams.get("district") ?? "";
  const presetSettlement = searchParams.get("settlement") ?? "";

  const [districtId, setDistrictId] = useState(presetDistrict);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!districtId) {
        if (!cancelled) setSettlements([]);
        return;
      }
      try {
        const res = await fetch(`/api/settlements?districtId=${districtId}`);
        const data = await res.json();
        if (!cancelled) setSettlements(data);
      } catch {
        if (!cancelled) setSettlements([]);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [districtId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setStatus("submitting");
    setErrorMsg(null);

    const form = new FormData(formEl);
    const settlementValue = String(form.get("settlementId") || "");
    const payload = {
      districtId: String(form.get("districtId")),
      settlementId: settlementValue || undefined,
      category: String(form.get("category")),
      reporterName: String(form.get("reporterName") || "") || undefined,
      contact: String(form.get("contact") || "") || undefined,
      description: String(form.get("description")),
    };

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ? JSON.stringify(body.error) : "Submission failed");
      }
      setStatus("done");
      formEl.reset();
      setDistrictId("");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }

  if (status === "done") {
    return (
      <div
        className="rounded-xl p-4 text-sm"
        style={{ background: "var(--status-good)15", border: "1px solid var(--status-good)55" }}
      >
        Thank you — your report was submitted and is pending review. It will not change official risk
        scores automatically, but helps the team cross-check ground conditions.
        <button onClick={() => setStatus("idle")} className="mt-3 block text-sm font-medium underline">
          Submit another report
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">District *</label>
          <select
            name="districtId"
            required
            value={districtId}
            onChange={(e) => setDistrictId(e.target.value)}
            className={inputClass}
            style={inputStyle}
          >
            <option value="" disabled>
              Select a district…
            </option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">City / Town / Area (optional)</label>
          <select
            name="settlementId"
            defaultValue={presetSettlement}
            disabled={settlements.length === 0}
            className={inputClass}
            style={inputStyle}
          >
            <option value="">District-wide / not sure</option>
            {settlements.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Hazard type</label>
        <select name="category" required className={inputClass} style={inputStyle}>
          {HAZARD_LIST.map((h) => (
            <option key={h.category} value={h.category}>
              {h.icon} {h.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">What are you seeing? *</label>
        <textarea
          name="description"
          required
          minLength={5}
          maxLength={2000}
          rows={4}
          placeholder="Describe the situation: location detail, severity, who/what is affected…"
          className={inputClass}
          style={inputStyle}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Your name (optional)</label>
          <input name="reporterName" className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Phone / contact (optional)</label>
          <input name="contact" className={inputClass} style={inputStyle} />
        </div>
      </div>

      {errorMsg && <p className="text-sm" style={{ color: "var(--status-critical)" }}>{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60"
        style={{ background: "var(--brand-primary)" }}
      >
        {status === "submitting" ? "Submitting…" : "Submit report"}
      </button>
    </form>
  );
}
