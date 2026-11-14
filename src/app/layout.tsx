import type { Metadata, Viewport } from "next";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";


export const metadata: Metadata = {
  title: "MoveScan",
  description: "Movement efficiency assessments for trainers",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "MoveScan", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#070b12",
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
