"use client";

import Link from "next/link";
import { SearchBar } from "./SearchBar";
import { NotificationBell } from "./NotificationBell";
import { LiveClock } from "./LiveClock";

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3 backdrop-blur"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 92%, transparent)" }}
    >
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-lg lg:hidden"
      >
        ☰
      </button>

      <Link href="/" className="flex items-center gap-2 font-semibold lg:hidden">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
          style={{ background: "var(--brand-primary)" }}
        >
          SL
        </span>
      </Link>

      <div className="min-w-0 flex-1">
        <SearchBar />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <LiveClock />
        <NotificationBell />
      </div>
    </header>
  );
}
