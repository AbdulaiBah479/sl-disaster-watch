"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-64 flex-col" style={{ background: "var(--sidebar-bg)" }}>
      <div className="flex items-center gap-2 px-5 py-5">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
          style={{ background: "var(--brand-teal)", color: "#ffffff" }}
        >
          SL
        </span>
        <div className="leading-tight">
          <p className="font-semibold text-white">Disaster Watch</p>
          <p className="text-[11px]" style={{ color: "var(--sidebar-fg)" }}>
            Early Warning System
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
              style={{
                color: active ? "var(--sidebar-fg-active)" : "var(--sidebar-fg)",
                background: active ? "var(--sidebar-active-bg)" : "transparent",
                borderLeft: active ? "3px solid var(--brand-teal)" : "3px solid transparent",
              }}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="border-t px-4 py-4 text-[11px]" style={{ borderColor: "rgba(255,255,255,0.08)", color: "var(--sidebar-fg)" }}>
        Portfolio demo — not an official
        <br /> government early-warning system.
      </div>
    </nav>
  );
}
