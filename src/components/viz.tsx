"use client";

import { useState } from "react";
import { REGION_LABELS, type Region } from "@/lib/battery";
import type { ScoreResult } from "@/lib/scoring";

export const scoreColor = (pct: number | null) =>
  pct === null ? "var(--color-faint)" : pct >= 80 ? "var(--color-good)" : pct >= 60 ? "var(--color-warn)" : "var(--color-bad)";

export function ScoreRing({ pct, label, size = 120, delta }: { pct: number | null; label: string; size?: number; delta?: number | null }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const v = pct ?? 0;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth="7" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={scoreColor(pct)}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${(v / 100) * circ} ${circ}`}
            style={{ filter: `drop-shadow(0 0 6px ${scoreColor(pct)})`, transition: "stroke-dasharray .8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono font-semibold" style={{ fontSize: size / 4.6 }}>
            {pct === null ? "n/a" : `${Math.round(pct)}%`}
          </span>
          {delta != null && Math.abs(delta) >= 0.5 && (
            <span className="font-mono text-xs" style={{ color: delta > 0 ? "var(--color-good)" : "var(--color-bad)" }}>
              {delta > 0 ? "▲" : "▼"} {Math.abs(Math.round(delta))}
            </span>
          )}
        </div>
      </div>
      <span className="label">{label}</span>
    </div>
  );
}

export function MovementBar({ label, pct, delta, skipped }: { label: string; pct: number | null; delta?: number | null; skipped?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono">
          {skipped ? <span className="text-faint">skipped</span> : `${Math.round(pct ?? 0)}%`}
          {delta != null && Math.abs(delta) >= 0.5 && (
            <span className="ml-2 text-xs" style={{ color: delta > 0 ? "var(--color-good)" : "var(--color-bad)" }}>
              {delta > 0 ? "+" : "−"}
              {Math.abs(Math.round(delta))}
            </span>
          )}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full"
          style={{ width: `${skipped ? 0 : pct ?? 0}%`, background: scoreColor(pct), boxShadow: `0 0 10px ${scoreColor(pct)}`, transition: "width .8s ease" }}
        />
      </div>
    </div>
  );
}

// ---------------- Body heatmap ----------------
// Each shape is drawn for the viewer-left half of the body and mirrored for the other half.
// Front view: viewer-left is the client's RIGHT. Back view: viewer-left is the client's LEFT.
type Shape = { region: Region | null; d: string };

const FRONT: Shape[] = [
  { region: "neck", d: "M91 56 H100 V74 H88 Z" },
  { region: "shoulder", d: "M86 77 Q62 77 54 98 L55 150 L68 150 L71 110 L80 96 Z" },
  { region: null, d: "M56 154 L68 154 L66 206 L57 206 Z" },
  { region: "trunk", d: "M100 77 L90 77 L82 96 L76 110 L77 170 L100 172 Z" },
  { region: "hip", d: "M77 173 L100 175 L100 201 L72 207 Q71 188 77 173 Z" },
  { region: null, d: "M72 210 L100 204 L96 260 L76 262 Z" },
  { region: "knee", d: "M76 265 L96 263 L95 291 L77 291 Z" },
  { region: null, d: "M77 294 L95 294 L92 369 L80 369 Z" },
  { region: "foot", d: "M79 372 L93 372 L96 391 L70 395 Q70 385 79 372 Z" },
];

const BACK: Shape[] = [
  { region: "neck", d: "M91 56 H100 V74 H88 Z" },
  { region: "shoulder", d: "M86 77 Q62 77 54 98 L55 150 L68 150 L71 110 L80 96 Z" },
  { region: null, d: "M56 154 L68 154 L66 206 L57 206 Z" },
  { region: "upper_back", d: "M100 77 L90 77 L82 96 L76 110 L77 128 L100 128 Z" },
  { region: "low_back", d: "M77 131 L100 131 L100 172 L77 170 Z" },
  { region: "hip", d: "M77 173 L100 175 L100 201 L72 207 Q71 188 77 173 Z" },
  { region: null, d: "M72 210 L100 204 L96 260 L76 262 Z" },
  { region: "knee", d: "M76 265 L96 263 L95 291 L77 291 Z" },
  { region: null, d: "M77 294 L95 294 L92 369 L80 369 Z" },
  { region: "foot", d: "M79 372 L93 372 L96 391 L70 395 Q70 385 79 372 Z" },
];

function heatFill(failRate: number) {
  if (failRate <= 0) return "rgba(46,230,214,0.10)";
  // amber at low fail rates, hot red at high
  const t = Math.min(1, failRate);
  const r = 251 + (244 - 251) * t;
  const g = 191 + (63 - 191) * t;
  const b = 36 + (94 - 36) * t;
  return `rgba(${r | 0},${g | 0},${b | 0},${0.35 + 0.6 * t})`;
}

function Figure({
  shapes,
  regions,
  leftSide,
  title,
  selected,
  onSelect,
}: {
  shapes: Shape[];
  regions: ScoreResult["regions"];
  leftSide: "R" | "L"; // which client side is on the viewer's left
  title: string;
  selected: Region | null;
  onSelect: (r: Region) => void;
}) {
  const other = leftSide === "R" ? "L" : "R";
  const rate = (region: Region, side: "R" | "L") => {
    const s = regions[region]?.[side];
    return s && s.pct !== null ? 1 - s.pct / 100 : 0;
  };
  const draw = (side: "R" | "L", mirror: boolean) =>
    shapes.map((s, i) => {
      const fr = s.region ? rate(s.region, side) : 0;
      const isSel = s.region && s.region === selected;
      return (
        <path
          key={`${side}${i}`}
          d={s.d}
          transform={mirror ? "translate(200,0) scale(-1,1)" : undefined}
          fill={s.region ? heatFill(fr) : "rgba(135,150,171,0.06)"}
          stroke={isSel ? "var(--color-ink)" : s.region ? "rgba(46,230,214,0.45)" : "rgba(135,150,171,0.2)"}
          strokeWidth={isSel ? 1.6 : 0.8}
          filter={fr > 0 ? "url(#glow)" : undefined}
          className={s.region ? "cursor-pointer" : undefined}
          onClick={() => s.region && onSelect(s.region)}
        >
          {s.region && <title>{`${REGION_LABELS[s.region]} (${side === "R" ? "right" : "left"})`}</title>}
        </path>
      );
    });

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="40 10 120 395" className="h-[340px] w-auto sm:h-[420px]">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="scan" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="34" r="19" fill="rgba(135,150,171,0.06)" stroke="rgba(135,150,171,0.25)" strokeWidth="0.8" />
        {draw(leftSide, false)}
        {draw(other, true)}
        <line x1="100" y1="58" x2="100" y2="200" stroke="rgba(46,230,214,0.15)" strokeDasharray="2 3" />
        <rect x="40" width="120" height="30" fill="url(#scan)" className="no-print">
          <animate attributeName="y" from="-30" to="400" dur="2.4s" repeatCount="1" fill="freeze" />
          <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.85;1" dur="2.4s" fill="freeze" />
        </rect>
        <text x="48" y="400" className="fill-[var(--color-dim)] font-mono" fontSize="9">{leftSide}</text>
        <text x="146" y="400" className="fill-[var(--color-dim)] font-mono" fontSize="9">{other}</text>
      </svg>
      <span className="label mt-1">{title}</span>
    </div>
  );
}

export function BodyMap({
  regions,
  failsByRegion,
}: {
  regions: ScoreResult["regions"];
  failsByRegion: Partial<Record<Region, { label: string; side: string }[]>>;
}) {
  const [selected, setSelected] = useState<Region | null>(null);
  const items = selected ? failsByRegion[selected] ?? [] : [];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center gap-2 sm:gap-8">
        <Figure shapes={FRONT} regions={regions} leftSide="R" title="Front" selected={selected} onSelect={setSelected} />
        <Figure shapes={BACK} regions={regions} leftSide="L" title="Back" selected={selected} onSelect={setSelected} />
      </div>
      <div className="min-h-24 rounded-xl border border-line bg-bg/60 p-4">
        {selected ? (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">{REGION_LABELS[selected]}</span>
              <button className="text-xs text-dim" onClick={() => setSelected(null)}>
                clear
              </button>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-good">No compensations found here.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {items.map((f, i) => (
                  <li key={i} className="flex justify-between gap-4">
                    <span>{f.label}</span>
                    <span className="font-mono text-dim">{f.side}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-sm text-dim">Tap a highlighted area to see what was found there.</p>
        )}
      </div>
    </div>
  );
}

// ---------------- History chart ----------------
export function HistoryChart({ points }: { points: { date: string; pct: number }[] }) {
  if (points.length < 2)
    return <p className="text-sm text-dim">The progress line shows up after the first retest.</p>;
  const W = 600;
  const H = 180;
  const pad = 28;
  const xs = (i: number) => pad + (i * (W - pad * 2)) / (points.length - 1);
  const ys = (v: number) => H - pad - (v / 100) * (H - pad * 2);
  const d = points.map((p, i) => `${i ? "L" : "M"}${xs(i)} ${ys(p.pct)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={pad} x2={W - pad} y1={ys(v)} y2={ys(v)} stroke="var(--color-line)" strokeDasharray="3 4" />
          <text x={4} y={ys(v) + 4} fontSize="10" className="fill-[var(--color-faint)] font-mono">{v}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" style={{ filter: "drop-shadow(0 0 6px var(--color-accent))" }} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={xs(i)} cy={ys(p.pct)} r="5" fill="var(--color-bg)" stroke="var(--color-accent)" strokeWidth="2" />
          <text x={xs(i)} y={ys(p.pct) - 10} textAnchor="middle" fontSize="11" className="fill-[var(--color-ink)] font-mono">
            {Math.round(p.pct)}
          </text>
          <text x={xs(i)} y={H - 6} textAnchor="middle" fontSize="10" className="fill-[var(--color-dim)] font-mono">
            {new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" })}
          </text>
        </g>
      ))}
    </svg>
  );
}
