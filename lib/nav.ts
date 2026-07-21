export interface NavItem {
  label: string;
  href: string;
  icon: string;
  mobilePrimary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "\u{1F3E0}", mobilePrimary: true },
  { label: "Live Map", href: "/map", icon: "\u{1F5FA}️", mobilePrimary: true },
  { label: "Alerts", href: "/alerts", icon: "\u{1F6A8}", mobilePrimary: true },
  { label: "Reports", href: "/report", icon: "\u{1F4DD}", mobilePrimary: true },
  { label: "Risk Analysis", href: "/risk-analysis", icon: "\u{1F4CA}" },
  { label: "History", href: "/history", icon: "\u{1F4DC}" },
  { label: "Admin", href: "/admin", icon: "\u{1F6E1}️" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
  { label: "Help & Sources", href: "/about", icon: "❓", mobilePrimary: true },
];
