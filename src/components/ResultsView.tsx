"use client";

import type { Region } from "@/lib/battery";
import { failedCompensations, scoreScan } from "@/lib/scoring";
import type { Scan } from "@/lib/types";
import { BodyMap, MovementBar, ScoreRing } from "./viz";

const sideLabel = { R: "Right", L: "Left", W: "Whole body" } as const;

export default function ResultsView({
  scan,
  name,
  previous,
  actions,
}: {
  scan: Scan;
  name: string;
  previous?: Scan | null;
  actions?: React.ReactNode;
}) {
  const s = scoreScan(scan);
  const p = previous ? scoreScan(previous) : null;
  const delta = (a: number | null, b: number | null | undefined) => (a === null || b == null ? null : a - b);
  const fails = failedCompensations(scan.fails);

  const failsByRegion: Partial<Record<Region, { label: string; side: string }[]>> = {};
  for (const f of fails) (failsByRegion[f.region] ??= []).push({ label: `${f.movement}: ${f.compensation}`, side: sideLabel[f.side] });

  // Collapse a compensation that failed on both sides into one "Both sides" row.
  const collapse = (list: typeof fails) => {
    const out: { compensation: string; side: string }[] = [];
    for (const f of list) {
      const hit = out.find((o) => o.compensation === f.compensation);
      if (hit) hit.side = "Both sides";
      else out.push({ compensation: f.compensation, side: sideLabel[f.side] });
    }
    return out;
  };
  const byMovement = s.movements.map((m) => ({
    ...m,
    fails: collapse(fails.filter((f) => f.movement === m.label)),
    note: scan.notes?.[m.key],
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Movement efficiency scan</p>
          <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
          <p className="text-sm text-dim">
            {new Date(scan.performed_at).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
            {previous && <> · compared with {new Date(previous.performed_at).toLocaleDateString()}</>}
          </p>
        </div>
        {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="panel p-5">
          <p className="label mb-4">Body map</p>
          <BodyMap regions={s.regions} failsByRegion={failsByRegion} />
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-dim">
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(46,230,214,.25)" }} /> clear</span>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-warn" /> some</span>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-bad" /> most</span>
          </div>
        </section>

        <div className="space-y-6">
          <section className="panel p-5">
            <div className="flex flex-wrap items-center justify-around gap-4">
              <ScoreRing pct={s.total.pct} label="Total" size={150} delta={delta(s.total.pct, p?.total.pct)} />
              <div className="flex gap-4">
                <ScoreRing pct={s.right.pct} label="Right" size={92} delta={delta(s.right.pct, p?.right.pct)} />
                <ScoreRing pct={s.left.pct} label="Left" size={92} delta={delta(s.left.pct, p?.left.pct)} />
                <ScoreRing pct={s.synergistic.pct} label="Synergy" size={92} delta={delta(s.synergistic.pct, p?.synergistic.pct)} />
              </div>
            </div>
          </section>

          <section className="panel space-y-4 p-5">
            <p className="label">By movement</p>
            {s.movements.map((m, i) => (
              <MovementBar key={m.key} label={m.label} pct={m.score.pct} skipped={m.skipped} delta={delta(m.score.pct, p?.movements[i]?.score.pct)} />
            ))}
          </section>
        </div>
      </div>

      <section className="panel p-5">
        <p className="label mb-4">What we found</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {byMovement.map((m) => (
            <div key={m.key} className="rounded-xl border border-line bg-bg/50 p-4">
              <div className="mb-2 flex justify-between">
                <span className="font-semibold">{m.label}</span>
                <span className="font-mono text-sm text-dim">{m.skipped ? "skipped" : `${Math.round(m.score.pct ?? 0)}%`}</span>
              </div>
              {m.skipped ? null : m.fails.length === 0 ? (
                <p className="text-sm text-good">Clean, no compensations.</p>
              ) : (
                <ul className="space-y-0.5 text-sm">
                  {m.fails.map((f, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{f.compensation}</span>
                      <span className="font-mono text-xs text-dim">{f.side}</span>
                    </li>
                  ))}
                </ul>
              )}
              {m.note && <p className="mt-2 border-t border-line pt-2 text-xs text-dim">{m.note}</p>}
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-sm text-dim">
        Next retest: <span className="font-mono text-ink">{new Date(scan.retest_due + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>
      </p>
    </div>
  );
}
