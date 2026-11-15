import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS ignores SVG icons, so the home-screen icon is rendered to PNG at build time.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0a0b0d" }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff4cf" />
              <stop offset="0.28" stopColor="#ffb648" />
              <stop offset="0.6" stopColor="#ff5a3a" />
              <stop offset="1" stopColor="#c4246f" />
            </linearGradient>
          </defs>
          <path d="M11 19.5 16.5 14h31l5.5 5.5V28H38.5v17L32 54.5 25.5 45V28H11Z" fill="url(#g)" />
        </svg>
      </div>
    ),
    size,
  );
}
