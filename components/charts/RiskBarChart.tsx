import Link from "next/link";
import { RISK_LEVEL_META, scoreToLevel } from "@/lib/hazards";

interface BarItem {
  id: string;
  label: string;
  score: number;
  href: string;
}

// Horizontal bar chart, one bar per district, colored by its status level
// (not a cycled categorical palette — the fixed 4-step status ramp) with a
// direct value label. No axis lines needed at this scale; the 0-100 domain
// is implied by the fixed max-width track.
export function RiskBarChart({ items }: { items: BarItem[] }) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const level = scoreToLevel(item.score);
        const meta = RISK_LEVEL_META[level];
        return (
          <Link
            key={item.id}
            href={item.href}
            className="group flex items-center gap-3 text-sm"
          >
            <span className="w-28 shrink-0 truncate text-muted group-hover:text-foreground">
              {item.label}
            </span>
            <span className="h-3 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <span
                className="block h-full rounded-full transition-all"
                style={{ width: `${Math.max(item.score, 3)}%`, background: meta.color }}
              />
            </span>
            <span className="w-10 shrink-0 text-right font-semibold tabular-nums">
              {Math.round(item.score)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
