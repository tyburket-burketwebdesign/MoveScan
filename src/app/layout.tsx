import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://move-scan-sand.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "MoveScan", template: "%s · MoveScan" },
  description: "Movement efficiency scans with a thermal body map, client reports and automatic retest reminders.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "MoveScan", statusBarStyle: "black-translucent" },
  openGraph: { title: "MoveScan", description: "Movement efficiency scans for trainers", siteName: "MoveScan" },
};

export const viewport: Viewport = {
  themeColor: "#13102a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
