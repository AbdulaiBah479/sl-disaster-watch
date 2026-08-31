import { findAgency } from "@/lib/agencies";

// Direct, one-click access to the three channels this app's own guidance
// already tells people to check independently (see lib/recommendations.ts's
// TSUNAMI guidance: "check NOAA PTWC and GDACS directly") — surfaced here
// instead of leaving them buried in the full /agencies directory. Pulls from
// lib/agencies.ts so the links/phone number stay in sync with one source.
export function OfficialChannels() {
  const ndma = findAgency("ndma");
  const gdacs = findAgency("gdacs");
  const ptwc = findAgency("noaa-ptwc");

  const links: { label: string; icon: string; href: string }[] = [];
  if (ndma?.website) links.push({ label: "NDMA", icon: "🏛️", href: ndma.website });
  if (ndma?.facebook) links.push({ label: "NDMA Facebook", icon: "📘", href: ndma.facebook });
  if (gdacs?.website) links.push({ label: "GDACS", icon: "🌍", href: gdacs.website });
  if (ptwc?.website) links.push({ label: "NOAA PTWC", icon: "🌊", href: ptwc.website });

  if (links.length === 0) return null;

  return (
    <div className="rounded-lg border p-3 text-xs" style={{ borderColor: "var(--border-strong)" }}>
      <p className="font-semibold">Official channels — direct, not via this dashboard</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium transition hover:bg-black/5 dark:hover:bg-white/10"
            style={{ borderColor: "var(--border)" }}
          >
            {l.icon} {l.label} ↗
          </a>
        ))}
      </div>
      {ndma?.phone && <p className="mt-1.5 text-muted">📞 NDMA: {ndma.phone}</p>}
    </div>
  );
}
