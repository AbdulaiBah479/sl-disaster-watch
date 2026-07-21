"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Entry {
  id: string;
  name: string;
  kind: "District" | "City" | "Town" | "Area";
  href: string;
}

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/districts").then((r) => r.json()),
      fetch("/api/settlements").then((r) => r.json()),
    ])
      .then(([districts, settlements]) => {
        const districtEntries: Entry[] = districts.map((d: { id: string; name: string }) => ({
          id: d.id,
          name: d.name,
          kind: "District" as const,
          href: `/districts/${d.id}`,
        }));
        const settlementEntries: Entry[] = settlements.map(
          (s: { id: string; name: string; type: "CITY" | "TOWN" | "AREA"; districtId: string }) => ({
            id: s.id,
            name: s.name,
            kind: s.type === "CITY" ? "City" : s.type === "TOWN" ? "Town" : "Area",
            href: `/districts/${s.districtId}/settlements/${s.id}`,
          }),
        );
        setEntries([...districtEntries, ...settlementEntries]);
      })
      .catch(() => setEntries([]));
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results =
    query.trim().length > 0
      ? entries.filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
      : [];

  function go(href: string) {
    setQuery("");
    setOpen(false);
    router.push(href);
  }

  return (
    <div className="relative w-full max-w-sm" ref={ref}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">🔍</span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search district, city, town or area…"
          className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg shadow-lg surface-card">
          {results.map((r) => (
            <button
              key={r.href}
              onClick={() => go(r.href)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-black/[.03] dark:hover:bg-white/[.05]"
            >
              <span>{r.name}</span>
              <span className="text-xs text-muted">{r.kind}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
