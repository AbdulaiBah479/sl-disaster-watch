import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SL Disaster Watch — Sierra Leone Multi-Hazard Early Warning",
  description:
    "A multi-hazard early warning and risk analytics platform for Sierra Leone: earthquakes, floods, landslides, drought, wildfire, storms, air quality, and human, livestock & crop disease risk — down to city, town and area level, built from live public data sources.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* Browser extensions (Grammarly, dark-mode toggles, password managers) commonly
          inject attributes into <html>/<body> before React hydrates — suppressHydrationWarning
          on these two elements silences the resulting false-positive attribute-mismatch
          warning without hiding a genuine content mismatch anywhere else in the tree. */}
      <body className="min-h-full" suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
