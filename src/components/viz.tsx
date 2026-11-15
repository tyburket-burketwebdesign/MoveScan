"use client";

import { useId, useState } from "react";
import { REGION_LABELS, type Region } from "@/lib/battery";
import type { ScoreResult } from "@/lib/scoring";

// ---------- color ----------
// Ironbow thermal ramp: cold violet -> magenta -> orange -> white-hot. Used only for data.
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

export function Delta({ d, className = "" }: { d: number | null | undefined; className?: string }) {
  if (d == null || Math.abs(d) < 0.5) return null;
  return (
    <span className={`num inline-flex items-center gap-0.5 ${className}`} style={{ color: deltaColor(d) }}>
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden style={{ transform: d > 0 ? undefined : "rotate(180deg)" }}>
        <path d="M5 1.5 9 8H1z" fill="currentColor" />
      </svg>
      {Math.abs(Math.round(d))}
    </span>
  );
}

// ---------- instrument dial ----------
// 270° dial built from ticks, like a watch bezel. Lit ticks show the score.
export function Dial({ pct, label, size = 120, delta }: { pct: number | null; label: string; size?: number; delta?: number | null }) {
  const n = 45;
  const v = Math.max(0, Math.min(100, pct ?? 0)) / 100;
  const lit = Math.round(v * n);
  const c = size / 2;
  const r1 = size / 2 - 3;
  const r2 = r1 - Math.max(6, size / 14);
  const color = scoreColor(pct);
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} aria-hidden>
          {Array.from({ length: n + 1 }, (_, i) => {
            const a = ((135 + (270 * i) / n) * Math.PI) / 180;
            const major = i % 9 === 0;
            const rr = major ? r2 - 3 : r2;
            return (
              <line
                key={i}
                x1={c + r1 * Math.cos(a)}
                y1={c + r1 * Math.sin(a)}
                x2={c + rr * Math.cos(a)}
                y2={c + rr * Math.sin(a)}
                stroke={i <= lit && pct !== null ? color : "var(--color-line)"}
                strokeWidth={major ? 1.8 : 1.3}
                strokeLinecap="round"
                style={{ transition: `stroke .3s ${i * 12}ms` }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="readout" style={{ fontSize: size / 3.3 }}>
            {pct === null ? "–" : Math.round(pct)}
          </span>
          <Delta d={delta} className="mt-1 text-xs" />
        </div>
      </div>
      <span className="-mt-3 text-[13px] text-dim">{label}</span>
    </div>
  );
}

export function MovementBar({ label, pct, delta, skipped }: { label: string; pct: number | null; delta?: number | null; skipped?: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-2.5">
      <span className="text-[15px]">{label}</span>
      <span className="flex items-baseline gap-3">
        <Delta d={delta} className="text-xs" />
        <span className="num w-12 text-right">{skipped ? <span className="font-normal text-faint">Skip</span> : `${Math.round(pct ?? 0)}%`}</span>
      </span>
      <div className="relative col-span-2 h-[3px] rounded-full bg-line">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${skipped ? 0 : pct ?? 0}%`, background: scoreColor(pct), transition: "width 1.2s var(--ease-out-expo)" }}
        />
        {[25, 50, 75].map((t) => (
          <span key={t} className="absolute -top-[3px] h-[9px] w-px bg-bg" style={{ left: `${t}%` }} />
        ))}
      </div>
    </div>
  );
}

// ---------- thermal body ----------
// Half silhouette (viewer's right side), mirrored for the other half. Centerline x = 100.
const HALF =
  "M100 52 C104 52 107 53 108 55 L108.5 66 C110 71 116 74 124 76 C134 78 146 79 152 86 C157 92 158 101 158 110 C159 126 160 144 161 160 C163 176 165 194 166 210 C167 218 169 225 168 233 C167 240 160 241 158 234 C156 226 155 216 154 206 C152 190 149 172 147 156 C146 146 145 137 143 128 C142 142 140 156 138 168 C139 180 141 190 141 202 C141 228 137 256 133 282 C131 304 131 324 128 346 C127 360 126 372 127 381 C131 389 135 394 134 398 C126 400 117 400 109 398 C108 390 109 384 110 378 C110 352 109 322 109 298 C108 270 105 238 102 212 L100 208 Z";
const HALF_OPEN = HALF.replace(" Z", "");

// Anatomical contours (viewer's right half; mirrored).
const ANATOMY = {
  front: [
    "M134 97 C130 110 116 116 100 112",
    "M136 84 C140 96 142 106 146 114",
    "M100 130 C106 129 112 130 116 131",
    "M100 145 C106 144 112 145 116 146",
    "M100 160 C106 159 111 160 114 161",
    "M118 118 C120 140 120 160 116 178",
    "M136 178 C126 188 112 198 104 208",
    "M134 214 C128 236 126 252 128 268",
    "M112 220 C116 240 118 256 120 268",
    "M115 278 C117 272 125 272 127 278 C127 286 117 288 115 280",
    "M124 300 C122 330 121 350 120 372",
    "M150 120 C152 134 152 146 150 156",
    "M158 172 C160 190 162 204 163 216",
    "M108 64 C112 70 118 74 124 76",
  ],
  back: [
    "M108 92 C118 90 128 92 132 100 C128 112 118 122 110 120 C108 110 108 100 108 92",
    "M136 120 C128 140 120 156 106 172",
    "M102 186 C116 182 132 186 138 198 C136 210 120 216 102 212",
    "M121 222 C120 240 120 256 121 270",
    "M122 300 C130 312 131 330 126 346",
    "M122 300 C114 312 112 330 115 346",
    "M152 108 C155 124 156 138 154 152",
    "M158 172 C160 190 162 204 163 216",
    "M100 60 L100 205",
  ],
};

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
const LEVELS = [
  { y: 98, label: "Shoulder" },
  { y: 192, label: "Hip" },
  { y: 282, label: "Knee" },
];

export function ThermalBody({
  regions,
  view,
  height = 420,
  selected,
  onSelect,
  showSides = true,
  guides = false,
  theme = "dark",
  animate = false,
}: {
  regions: ScoreResult["regions"];
  view: "front" | "back";
  height?: number;
  selected?: Region | null;
  onSelect?: (r: Region) => void;
  showSides?: boolean;
  guides?: boolean;
  theme?: "dark" | "light";
  animate?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const anchors = view === "front" ? FRONT : BACK;
  const light = theme === "light";
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
  const mirror = "translate(200,0) scale(-1,1)";
  const guide = light ? "rgba(18,20,23,0.12)" : "rgba(255,255,255,0.07)";
  const guideText = light ? "#98a0a8" : "#5d646c";

  return (
    <svg viewBox={guides ? "-6 6 212 412" : "14 6 172 412"} style={{ height, width: "auto", maxWidth: "100%" }} role="img" aria-label={`${view} view thermal map`}>
      <defs>
        <clipPath id={`clip-${id}`}>
          <circle cx="100" cy="35" r="17" />
          <path d={HALF} />
          <path d={HALF} transform={mirror} />
        </clipPath>
        <linearGradient id={`base-${id}`} x1="0" x2="0" y1="0" y2="1">
          {light ? (
            <>
              <stop offset="0" stopColor="#d9d6ee" />
              <stop offset="1" stopColor="#c9c6e3" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#2f2468" />
              <stop offset="0.5" stopColor="#271e58" />
              <stop offset="1" stopColor="#1b1640" />
            </>
          )}
        </linearGradient>
        <radialGradient id={`plat-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={light ? "rgba(18,20,23,0.10)" : "rgba(143,213,255,0.10)"} />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
        <filter id={`blur-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={`soft-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* scanner platform */}
      <ellipse cx="100" cy="398" rx="78" ry="11" fill={`url(#plat-${id})`} />
      {[78, 58, 38].map((rx, i) => (
        <ellipse key={rx} cx="100" cy="398" rx={rx} ry={rx / 7} fill="none" stroke={guide} strokeWidth={i === 0 ? 0.8 : 0.5} />
      ))}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return <line key={i} x1={100 + 78 * Math.cos(a)} y1={398 + 11 * Math.sin(a)} x2={100 + 72 * Math.cos(a)} y2={398 + 10.1 * Math.sin(a)} stroke={guide} strokeWidth="0.6" />;
      })}

      {/* level guides */}
      {guides &&
        LEVELS.map((l) => (
          <g key={l.y}>
            <line x1="-4" x2="204" y1={l.y} y2={l.y} stroke={guide} strokeDasharray="1 3" strokeWidth="0.6" />
            <text x="-4" y={l.y - 3} fontSize="6" fill={guideText} letterSpacing="0.2">
              {l.label}
            </text>
          </g>
        ))}

      <g clipPath={`url(#clip-${id})`}>
        <rect x="0" y="0" width="200" height="420" fill={`url(#base-${id})`} />
        <g filter={`url(#blur-${id})`} opacity={light ? 0.35 : 0.6}>
          <ellipse cx="100" cy="125" rx="30" ry="45" fill={light ? "#b6b0e0" : "#3d2a85"} />
        </g>
        <g className={animate ? "heat-in" : undefined}>
          <g filter={`url(#blur-${id})`}>
            {placed.map((p, i) => {
              const t = rate(p.region, p.side);
              if (t <= 0) return null;
              return <circle key={i} cx={p.cx} cy={p.y} r={p.r * (1.1 + 0.4 * t)} fill={heat(0.5 + 0.5 * t, 0.95)} />;
            })}
          </g>
          <g filter={`url(#soft-${id})`}>
            {placed.map((p, i) => {
              const t = rate(p.region, p.side);
              if (t < 0.25) return null;
              return <circle key={i} cx={p.cx} cy={p.y} r={p.r * 0.45} fill={heat(Math.min(1, 0.55 + 0.5 * t))} />;
            })}
          </g>
        </g>
        <g fill="none" stroke={light ? "rgba(18,20,23,0.18)" : "rgba(255,255,255,0.13)"} strokeWidth="0.55" strokeLinecap="round">
          {ANATOMY[view].map((d, i) => (
            <g key={i}>
              <path d={d} />
              <path d={d} transform={mirror} />
            </g>
          ))}
        </g>
      </g>

      <g fill="none" stroke={light ? "rgba(18,20,23,0.3)" : "rgba(220,225,255,0.3)"} strokeWidth="0.7">
        <circle cx="100" cy="35" r="17" />
        <path d={HALF_OPEN} />
        <path d={HALF_OPEN} transform={mirror} />
      </g>

      {placed.map((p, i) => (
        <g key={`h${i}`}>
          {selected === p.region && (
            <g stroke={light ? "#121417" : "#f5f6f7"} fill="none" strokeWidth="0.9">
              <circle cx={p.cx} cy={p.y} r={p.r + 4} strokeDasharray="2 2.5" />
              <line x1={p.cx - p.r - 8} x2={p.cx - p.r - 3} y1={p.y} y2={p.y} />
              <line x1={p.cx + p.r + 3} x2={p.cx + p.r + 8} y1={p.y} y2={p.y} />
            </g>
          )}
          {onSelect && (
            <circle cx={p.cx} cy={p.y} r={Math.max(p.r, 13)} fill="transparent" className="cursor-pointer" onClick={() => onSelect(p.region)}>
              <title>{`${REGION_LABELS[p.region]}, ${p.side === "R" ? "right" : "left"}`}</title>
            </circle>
          )}
        </g>
      ))}

      {showSides && (
        <g fill={guideText} fontSize="7.5" fontWeight="500">
          <text x="26" y="416">{view === "front" ? "R" : "L"}</text>
          <text x="174" y="416" textAnchor="end">{view === "front" ? "L" : "R"}</text>
        </g>
      )}
    </svg>
  );
}

export function HeatLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 text-xs text-dim ${className}`}>
      <span>Clear</span>
      <span className="h-[3px] w-24 rounded-full" style={{ background: HEAT_GRADIENT }} />
      <span>Most compensation</span>
    </div>
  );
}

export function BodyMap({
  regions,
  failsByRegion,
  height = 440,
  theme = "dark",
  animate = false,
}: {
  regions: ScoreResult["regions"];
  failsByRegion: Partial<Record<Region, { label: string; side: string }[]>>;
  height?: number;
  theme?: "dark" | "light";
  animate?: boolean;
}) {
  const [selected, setSelected] = useState<Region | null>(null);
  const items = selected ? failsByRegion[selected] ?? [] : [];
  const pick = (r: Region) => setSelected(r === selected ? null : r);
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex w-full justify-center gap-0 sm:gap-4">
        <figure className="flex min-w-0 flex-1 flex-col items-center gap-1 sm:flex-none">
          <ThermalBody regions={regions} view="front" height={height} selected={selected} onSelect={pick} theme={theme} animate={animate} />
          <figcaption className="text-[13px] text-dim">Anterior</figcaption>
        </figure>
        <figure className="flex min-w-0 flex-1 flex-col items-center gap-1 sm:flex-none">
          <ThermalBody regions={regions} view="back" height={height} selected={selected} onSelect={pick} theme={theme} animate={animate} />
          <figcaption className="text-[13px] text-dim">Posterior</figcaption>
        </figure>
      </div>
      <HeatLegend />
      <div className="w-full border-t border-hair pt-4" aria-live="polite">
        {selected ? (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">{REGION_LABELS[selected]}</span>
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
          <p className="text-center text-sm text-dim">Tap an area of the body to see what was found.</p>
        )}
      </div>
    </div>
  );
}

// ---------- history ----------
export function HistoryChart({ points, compact = false }: { points: { date: string; pct: number }[]; compact?: boolean }) {
  if (points.length < 2)
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-1 text-center">
        <p className="font-semibold">Baseline recorded</p>
        <p className="text-sm text-dim">The progress line starts after the first retest.</p>
      </div>
    );
  const W = compact ? 340 : 640;
  const H = compact ? 190 : 210;
  const px = 30;
  const py = 28;
  const xs = (i: number) => px + (i * (W - px * 2)) / (points.length - 1);
  const ys = (v: number) => H - py - (v / 100) * (H - py * 2);
  const line = points.map((p, i) => `${i ? "L" : "M"}${xs(i)} ${ys(p.pct)}`).join(" ");
  const area = `${line} L${xs(points.length - 1)} ${H - py} L${xs(0)} ${H - py} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Total score over time">
      <defs>
        <linearGradient id="hist-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--color-ice)" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--color-ice)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={px} x2={W - px} y1={ys(v)} y2={ys(v)} stroke="var(--color-hair)" />
          <text x={W - px + 6} y={ys(v) + 3} fontSize="10" className="fill-[var(--color-faint)]">
            {v}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#hist-fill)" />
      <path d={line} fill="none" stroke="var(--color-ice)" strokeWidth="1.75" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={xs(i)} cy={ys(p.pct)} r="4" fill="var(--color-surface)" stroke="var(--color-ice)" strokeWidth="1.75" />
          <text x={xs(i)} y={ys(p.pct) - 12} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="13" fontWeight="500" className="fill-[var(--color-ink)]">
            {Math.round(p.pct)}
          </text>
          <text x={xs(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="11" className="fill-[var(--color-dim)]">
            {new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </text>
        </g>
      ))}
    </svg>
  );
}
