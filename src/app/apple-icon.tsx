import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS ignores SVG icons, so the home-screen icon is rendered to PNG at build time.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "radial-gradient(circle at 62% 38%, #ffe28c 0%, #ff7a2f 25%, #e8367a 46%, #4a2696 75%)" }}>
        <svg width="180" height="180" viewBox="0 0 512 512">
          <path d="M80 272h96l48-112 64 208 48-96h96" fill="none" stroke="#13102a" strokeWidth="40" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
