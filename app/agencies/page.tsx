import { AGENCIES, type Agency, type AgencyType } from "@/lib/agencies";
import { HAZARD_LIST } from "@/lib/hazards";

export const metadata = {
  title: "Disaster Agencies — SL Disaster Watch",
};

const SECTION_META: Record<AgencyType, { title: string; blurb: string }> = {
  coordinator: {
    title: "National coordinators",
    blurb: "Cross-hazard bodies that coordinate Sierra Leone's overall disaster response.",
  },
  national: {
    title: "Sierra Leone government & national agencies",
    blurb: "Sector-specific government bodies, each responsible for a subset of hazards.",
  },
  international_partner: {
    title: "International & technical partners",
    blurb: "UN agencies and international bodies this dashboard also cites as data sources or coordinating bodies.",
  },
};

const SECTION_ORDER: AgencyType[] = ["coordinator", "national", "international_partner"];

function AgencyCard({ agency }: { agency: Agency }) {
  const hazardMetas =
    agency.hazardCategories === "ALL"
      ? null
      : HAZARD_LIST.filter((h) => (agency.hazardCategories as string[]).includes(h.category));

  return (
    <div className="surface-card rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">
          {agency.name}
          {agency.acronym && <span className="ml-1.5 text-sm font-normal text-muted">({agency.acronym})</span>}
        </h3>
        {agency.established && <span className="shrink-0 text-xs text-muted">est. {agency.established}</span>}
      </div>

      <p className="mt-1.5 text-sm text-muted">{agency.mandate}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {hazardMetas === null ? (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: "color-mix(in srgb, var(--brand-teal) 15%, transparent)", color: "var(--brand-teal)" }}
          >
            All hazards
          </span>
        ) : (
          hazardMetas.map((h) => (
            <span
              key={h.category}
              className="rounded-full px-2 py-0.5 text-xs"
              style={{ background: "color-mix(in srgb, var(--border-strong) 25%, transparent)" }}
            >
              {h.icon} {h.label}
            </span>
          ))
        )}
      </div>

      <div className="mt-3 space-y-0.5 text-xs text-muted">
        {agency.phone && <p>📞 {agency.phone}</p>}
        {agency.address && <p>📍 {agency.address}</p>}
        {agency.website && (
          <p>
            🔗{" "}
            <a href={agency.website} target="_blank" rel="noopener noreferrer" className="underline">
              {agency.website.replace(/^https?:\/\//, "")}
            </a>
          </p>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted">
        Source:{" "}
        <a href={agency.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          verify
        </a>
      </p>
    </div>
  );
}

export default function AgenciesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Disaster Management Agencies</h1>
        <p className="mt-1 text-sm text-muted">
          Who actually coordinates Sierra Leone&apos;s disaster response, by hazard. Every mandate, founding
          act, hotline and website below traces to a public source — click &quot;verify&quot; on any card.
          This directory is informational; in an active emergency, contact the relevant agency directly
          rather than relying on this dashboard.
        </p>
      </div>

      {SECTION_ORDER.map((type) => {
        const agencies = AGENCIES.filter((a) => a.type === type);
        if (agencies.length === 0) return null;
        const meta = SECTION_META[type];
        return (
          <section key={type}>
            <h2 className="text-lg font-semibold">{meta.title}</h2>
            <p className="mt-0.5 text-sm text-muted">{meta.blurb}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {agencies.map((a) => (
                <AgencyCard key={a.id} agency={a} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
