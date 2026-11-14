"use client";

import { useId, useState } from "react";
import { REGION_LABELS, type Region } from "@/lib/battery";
import type { ScoreResult } from "@/lib/scoring";

// ---------- color ----------
// Ironbow thermal ramp: cold violet -> magenta -> orange -> white-hot.
const RAMP: [number, [number, number, number]][] = [
  [0, [74, 38, 150]],
  [0.3, [140, 44, 190]],
  [0.55, [232, 54, 122]],
  [0.8, [255, 122, 47]],
  [1, [255, 226, 140]],
];
export const HEAT_GRADIENT = "linear-gradient(90deg, #4a2696, #8c2cbe 30%, #e8367a 55%, #ff7a2f 80%, #ffe28c)";

export function heat(t: number, alpha = 1) {
  const x = Math.max(0, Math.min(1, t));
  let i = 0;
  while (i < RAMP.length - 2 && x > RAMP[i + 1][0]) i++;
  const [a, ca] = RAMP[i];
  const [b, cb] = RAMP[i + 1];
  const k = (x - a) / (b - a);
  const c = ca.map((v, j) => Math.round(v + (cb[j] - v) * k));
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

export const scoreColor = (pct: number | null) =>
  pct === null ? "var(--color-faint)" : pct >= 80 ? "var(--color-ice)" : pct >= 60 ? "var(--color-amber)" : "var(--color-hot)";

export const deltaColor = (d: number) => (d > 0 ? "var(--color-ice)" : "var(--color-hot)");

// ---------- gauges ----------
export function Gauge({ pct, label, size = 112, delta, stroke }: { pct: number | null; label: string; size?: number; delta?: number | null; stroke?: number }) {
  const sw = stroke ?? Math.max(5, size / 18);
  const r = size / 2 - sw;
  const circ = 2 * Math.PI * r;
  const arc = 0.75; // 270° gauge
  const v = Math.max(0, Math.min(100, pct ?? 0)) / 100;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(135deg)" }} aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${arc * circ} ${circ}`} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={scoreColor(pct)}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${arc * circ * v} ${circ}`}
            style={{ transition: "stroke-dasharray 1s cubic-bezier(.2,.8,.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
          <span className="num leading-none" style={{ fontSize: size / 3.6 }}>
            {pct === null ? "–" : Math.round(pct)}
            <span className="text-dim" style={{ fontSize: size / 9 }}>%</span>
          </span>
          {delta != null && Math.abs(delta) >= 0.5 && (
            <span className="num mt-1 text-xs" style={{ color: deltaColor(delta) }}>
              {delta > 0 ? "+" : "−"}
              {Math.abs(Math.round(delta))}
            </span>
          )}
        </div>
      </div>
      <span className="-mt-2 text-sm text-dim">{label}</span>
    </div>
  );
}

export function MovementBar({ label, pct, delta, skipped }: { label: string; pct: number | null; delta?: number | null; skipped?: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-2">
      <span>{label}</span>
      <span className="num text-right">
        {delta != null && Math.abs(delta) >= 0.5 && (
          <span className="mr-2 text-xs" style={{ color: deltaColor(delta) }}>
            {delta > 0 ? "+" : "−"}
            {Math.abs(Math.round(delta))}
          </span>
        )}
        {skipped ? <span className="font-normal text-faint">Skipped</span> : `${Math.round(pct ?? 0)}%`}
      </span>
      <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full"
          style={{ width: `${skipped ? 0 : pct ?? 0}%`, background: scoreColor(pct), transition: "width 1s cubic-bezier(.2,.8,.2,1)" }}
        />
      </div>
    </div>
  );
}

// ---------- thermal body ----------
// Half silhouette (viewer's right side), mirrored for the other half. 200 x 410 box, centerline x = 100.
const HALF =
  "M100 52 C104 52 107 53 108 55 L108.5 66 C110 71 116 74 124 76 C134 78 146 79 152 86 C157 92 158 101 158 110 C159 126 160 144 161 160 C163 176 165 194 166 210 C167 218 169 225 168 233 C167 240 160 241 158 234 C156 226 155 216 154 206 C152 190 149 172 147 156 C146 146 145 137 143 128 C142 142 140 156 138 168 C139 180 141 190 141 202 C141 228 137 256 133 282 C131 304 131 324 128 346 C127 360 126 372 127 381 C131 389 135 394 134 398 C126 400 117 400 109 398 C108 390 109 384 110 378 C110 352 109 322 109 298 C108 270 105 238 102 212 L100 208 Z";
// Same outline left open so the stroke has no seam down the centerline.
const HALF_OPEN = HALF.replace(" Z", "");

type Anchor = { region: Region; x: number; y: number; r: number };
const FRONT: Anchor[] = [
  { region: "neck", x: 105, y: 64, r: 9 },
  { region: "shoulder", x: 145, y: 98, r: 17 },
  { region: "trunk", x: 118, y: 128, r: 21 },
  { region: "hip", x: 122, y: 192, r: 18 },
  { region: "knee", x: 121, y: 282, r: 13 },
  { region: "foot", x: 121, y: 388, r: 12 },
];
const BACK: Anchor[] = [
  { region: "neck", x: 105, y: 64, r: 9 },
  { region: "shoulder", x: 145, y: 98, r: 17 },
  { region: "upper_back", x: 117, y: 110, r: 20 },
  { region: "low_back", x: 113, y: 162, r: 17 },
  { region: "hip", x: 122, y: 194, r: 19 },
  { region: "knee", x: 121, y: 282, r: 13 },
  { region: "foot", x: 121, y: 390, r: 12 },
];

export function ThermalBody({
  regions,
  view,
  height = 420,
  selected,
  onSelect,
  showSides = true,
}: {
  regions: ScoreResult["regions"];
  view: "front" | "back";
  height?: number;
  selected?: Region | null;
  onSelect?: (r: Region) => void;
  showSides?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const anchors = view === "front" ? FRONT : BACK;
  // Front view faces you, so the client's right is on your left. Back view is the opposite.
  const sideAt = (viewerRight: boolean): "R" | "L" => (view === "front" ? (viewerRight ? "L" : "R") : viewerRight ? "R" : "L");
  const rate = (region: Region, side: "R" | "L") => {
    const s = regions[region]?.[side];
    return s && s.pct !== null ? 1 - s.pct / 100 : 0;
  };
  const placed = anchors.flatMap((a) => [
    { ...a, side: sideAt(true), cx: a.x },
    { ...a, side: sideAt(false), cx: 200 - a.x },
  ]);

  return (
    <svg viewBox="22 10 156 400" style={{ height, width: "auto" }} role="img" aria-label={`${view} body heat map`}>
      <defs>
        <clipPath id={`clip-${id}`}>
          <circle cx="100" cy="35" r="17" />
          <path d={HALF} />
          <path d={HALF} transform="translate(200,0) scale(-1,1)" />
        </clipPath>
        <linearGradient id={`base-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3b2a80" />
          <stop offset="0.45" stopColor="#33246f" />
          <stop offset="1" stopColor="#221a52" />
        </linearGradient>
        <filter id={`blur-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={`soft-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <pattern id={`scan-${id}`} width="4" height="3" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="rgba(255,255,255,0.05)" />
        </pattern>
      </defs>

      <g clipPath={`url(#clip-${id})`}>
        <rect x="0" y="0" width="200" height="410" fill={`url(#base-${id})`} />
        {/* resting body warmth in the core, the way a thermal camera sees any body */}
        <g filter={`url(#blur-${id})`} opacity="0.55">
          <ellipse cx="100" cy="125" rx="30" ry="45" fill="#4f2f9a" />
          <circle cx="100" cy="40" r="12" fill="#4f2f9a" />
        </g>
        <g filter={`url(#blur-${id})`}>
          {placed.map((p, i) => {
            const t = rate(p.region, p.side);
            if (t <= 0) return null;
            const k = 0.5 + 0.5 * t;
            return <circle key={i} cx={p.cx} cy={p.y} r={p.r * (1.1 + 0.4 * t)} fill={heat(k, 0.95)} />;
          })}
        </g>
        <g filter={`url(#soft-${id})`}>
          {placed.map((p, i) => {
            const t = rate(p.region, p.side);
            if (t < 0.25) return null;
            return <circle key={i} cx={p.cx} cy={p.y} r={p.r * 0.45} fill={heat(Math.min(1, 0.55 + 0.5 * t))} />;
          })}
        </g>
        <rect x="0" y="0" width="200" height="410" fill={`url(#scan-${id})`} />
      </g>

      <g fill="none" stroke="rgba(190,180,255,0.28)" strokeWidth="0.7">
        <circle cx="100" cy="35" r="17" />
        <path d={HALF_OPEN} />
        <path d={HALF_OPEN} transform="translate(200,0) scale(-1,1)" />
      </g>

      {placed.map((p, i) => {
        const isSel = selected === p.region;
        return (
          <g key={`h${i}`}>
            {isSel && <circle cx={p.cx} cy={p.y} r={p.r + 3} fill="none" stroke="var(--color-paper)" strokeWidth="1.2" strokeDasharray="3 2.5" />}
            {onSelect && (
              <circle
                cx={p.cx}
                cy={p.y}
                r={Math.max(p.r, 13)}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => onSelect(p.region)}
              >
                <title>{`${REGION_LABELS[p.region]}, ${p.side === "R" ? "right" : "left"}`}</title>
              </circle>
            )}
          </g>
        );
      })}

      {showSides && (
        <g className="fill-[var(--color-faint)]" fontSize="9" fontWeight="600">
          <text x="30" y="406">{view === "front" ? "Right" : "Left"}</text>
          <text x="170" y="406" textAnchor="end">{view === "front" ? "Left" : "Right"}</text>
        </g>
      )}
    </svg>
  );
}

export function HeatLegend() {
  return (
    <div className="flex items-center gap-3 text-xs text-dim">
      <span>Clear</span>
      <span className="h-1.5 w-28 rounded-full" style={{ background: HEAT_GRADIENT }} />
      <span>Most compensations</span>
    </div>
  );
}

export function BodyMap({
  regions,
  failsByRegion,
  height = 440,
}: {
  regions: ScoreResult["regions"];
  failsByRegion: Partial<Record<Region, { label: string; side: string }[]>>;
  height?: number;
}) {
  const [selected, setSelected] = useState<Region | null>(null);
  const items = selected ? failsByRegion[selected] ?? [] : [];
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex w-full justify-center gap-1 sm:gap-6">
        <figure className="flex flex-col items-center gap-2">
          <ThermalBody regions={regions} view="front" height={height} selected={selected} onSelect={(r) => setSelected(r === selected ? null : r)} />
          <figcaption className="text-sm text-dim">Front</figcaption>
        </figure>
        <figure className="flex flex-col items-center gap-2">
          <ThermalBody regions={regions} view="back" height={height} selected={selected} onSelect={(r) => setSelected(r === selected ? null : r)} />
          <figcaption className="text-sm text-dim">Back</figcaption>
        </figure>
      </div>
      <HeatLegend />
      <div className="w-full rounded-2xl bg-bg/60 p-4" aria-live="polite">
        {selected ? (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="wide font-semibold">{REGION_LABELS[selected]}</span>
              <button className="text-sm text-dim hover:text-ink" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-ice">Nothing found here.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {items.map((f, i) => (
                  <li key={i} className="flex justify-between gap-4">
                    <span>{f.label}</span>
                    <span className="text-dim">{f.side}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-center text-sm text-dim">Tap the body to see what was found in each area.</p>
        )}
      </div>
    </div>
  );
}

// ---------- history ----------
export function HistoryChart({ points }: { points: { date: string; pct: number }[] }) {
  if (points.length < 2)
    return (
      <div className="flex h-44 flex-col items-center justify-center gap-1 text-center">
        <p className="wide font-semibold">One scan so far</p>
        <p className="text-sm text-dim">The progress line starts after the first retest.</p>
      </div>
    );
  const W = 640;
  const H = 200;
  const px = 24;
  const py = 26;
  const xs = (i: number) => px + (i * (W - px * 2)) / (points.length - 1);
  const ys = (v: number) => H - py - (v / 100) * (H - py * 2);
  const line = points.map((p, i) => `${i ? "L" : "M"}${xs(i)} ${ys(p.pct)}`).join(" ");
  const area = `${line} L${xs(points.length - 1)} ${H - py} L${xs(0)} ${H - py} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Total score over time">
      <defs>
        <linearGradient id="hist-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--color-ice)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--color-ice)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[50, 100].map((v) => (
        <line key={v} x1={px} x2={W - px} y1={ys(v)} y2={ys(v)} stroke="var(--color-line)" strokeDasharray="2 5" />
      ))}
      <path d={area} fill="url(#hist-fill)" />
      <path d={line} fill="none" stroke="var(--color-ice)" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={xs(i)} cy={ys(p.pct)} r="5" fill="var(--color-bg)" stroke="var(--color-ice)" strokeWidth="2.5" />
          <text x={xs(i)} y={ys(p.pct) - 12} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="13" fontWeight="700" className="fill-[var(--color-ink)]">
            {Math.round(p.pct)}%
          </text>
          <text x={xs(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="11" className="fill-[var(--color-dim)]">
            {new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </text>
        </g>
      ))}
    </svg>
  );
}
