import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MoveScan";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#13102a", color: "#eeecf8" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "radial-gradient(circle at 62% 38%, #ffe28c 0%, #ff7a2f 25%, #e8367a 46%, #4a2696 75%)" }} />
          <div style={{ fontSize: 44, fontWeight: 800 }}>MoveScan</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, maxWidth: 900 }}>Your movement scan results are ready.</div>
          <div style={{ width: 420, height: 14, borderRadius: 7, background: "linear-gradient(90deg, #4a2696, #8c2cbe 30%, #e8367a 55%, #ff7a2f 80%, #ffe28c)" }} />
        </div>
      </div>
    ),
    size,
  );
}
