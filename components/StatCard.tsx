export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl p-4 surface-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        {icon && (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
            style={{ background: accent ? `${accent}22` : "var(--brand-teal)22" }}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold" style={{ color: accent }}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
