import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = BRAND.name;

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#0e1012", color: "#eceef0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="84" height="84" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff4cf" />
                <stop offset="0.28" stopColor="#ffb648" />
                <stop offset="0.6" stopColor="#ff5a3a" />
                <stop offset="1" stopColor="#c4246f" />
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="15" fill="#0a0b0d" stroke="#3a3f45" strokeWidth="1.5" />
            <path d="M11 19.5 16.5 14h31l5.5 5.5V28H38.5v17L32 54.5 25.5 45V28H11Z" fill="url(#g)" />
          </svg>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 12 }}>{BRAND.name.toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 96, fontWeight: 500, lineHeight: 1, letterSpacing: -3 }}>{BRAND.tagline}</div>
          <div style={{ width: 420, height: 8, borderRadius: 4, background: "linear-gradient(90deg, #4a2696, #8c2cbe 30%, #e8367a 55%, #ff7a2f 80%, #ffe28c)" }} />
        </div>
      </div>
    ),
    size,
  );
}
