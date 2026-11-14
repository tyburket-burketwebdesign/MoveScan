"use client";

import { REGION_LABELS, type Region } from "@/lib/battery";
import { failedCompensations, scoreScan } from "@/lib/scoring";
import type { Scan } from "@/lib/types";
import { BodyMap, Gauge, heat, MovementBar, scoreColor } from "./viz";

const sideLabel = { R: "Right", L: "Left", W: "Whole body" } as const;

export default function ResultsView({
  scan,
  name,
  previous,
  actions,
  gymName,
}: {
  scan: Scan;
  name: string;
  previous?: Scan | null;
  actions?: React.ReactNode;
  gymName?: string;
}) {
  const s = scoreScan(scan);
  const p = previous ? scoreScan(previous) : null;
  const delta = (a: number | null, b: number | null | undefined) => (a === null || b == null ? null : a - b);
  const fails = failedCompensations(scan.fails);
  const totalDelta = delta(s.total.pct, p?.total.pct);

  const failsByRegion: Partial<Record<Region, { label: string; side: string }[]>> = {};
  for (const f of fails) (failsByRegion[f.region] ??= []).push({ label: `${f.compensation} (${f.movement})`, side: sideLabel[f.side] });

  // Rank body areas by how much of what was tested there failed.
  const focus = (Object.entries(s.regions) as [Region, (typeof s.regions)[Region]][])
    .map(([region, r]) => {
      const possible = r.R.possible + r.L.possible;
      const failed = possible - r.R.passed - r.L.passed;
      const sides = [r.R.passed < r.R.possible && "right", r.L.passed < r.L.possible && "left"].filter(Boolean) as string[];
      return { region, rate: possible ? failed / possible : 0, sides };
    })
    .filter((x) => x.rate > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3);

  const collapse = (list: typeof fails) => {
    const out: { compensation: string; side: string }[] = [];
    for (const f of list) {
      const hit = out.find((o) => o.compensation === f.compensation);
      if (hit) hit.side = "Both sides";
      else out.push({ compensation: f.compensation, side: sideLabel[f.side] });
    }
    return out;
  };

  const date = new Date(scan.performed_at).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const due = new Date(scan.retest_due + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  return (
    <article className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-3 text-dim">{gymName ? `${gymName} movement scan` : "Movement scan"}, {date}</p>
          <h1 className="display text-5xl sm:text-6xl">{name}</h1>
        </div>
        {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="surface px-4 py-8 sm:px-8">
          <BodyMap regions={s.regions} failsByRegion={failsByRegion} />
        </div>

        <div className="flex flex-col gap-6">
          <div className="surface p-6 sm:p-8">
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-dim">Movement efficiency</p>
                <p className="display mt-2 text-[5.5rem] sm:text-[6.5rem]" style={{ color: scoreColor(s.total.pct) }}>
                  {Math.round(s.total.pct ?? 0)}
                  <span className="text-[0.4em] text-dim">%</span>
                </p>
                {totalDelta !== null && Math.abs(totalDelta) >= 0.5 ? (
                  <p className="mt-2 text-sm" style={{ color: totalDelta > 0 ? "var(--color-ice)" : "var(--color-hot)" }}>
                    {totalDelta > 0 ? "Up" : "Down"} {Math.abs(Math.round(totalDelta))} points since {new Date(previous!.performed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-dim">{s.total.passed} of {s.total.possible} checks passed</p>
                )}
              </div>
              <div className="flex justify-between gap-2 border-t border-line pt-6 sm:justify-around">
                <Gauge pct={s.right.pct} label="Right" size={96} delta={delta(s.right.pct, p?.right.pct)} />
                <Gauge pct={s.left.pct} label="Left" size={96} delta={delta(s.left.pct, p?.left.pct)} />
                <Gauge pct={s.synergistic.pct} label="Whole body" size={96} delta={delta(s.synergistic.pct, p?.synergistic.pct)} />
              </div>
            </div>
          </div>

          <div className="surface flex-1 p-6 sm:p-8">
            <h2 className="wide mb-5 text-xl font-bold">Focus areas</h2>
            {focus.length === 0 ? (
              <p className="text-ice">No compensations found. Clean scan.</p>
            ) : (
              <ol className="space-y-5">
                {focus.map((f, i) => (
                  <li key={f.region} className="grid grid-cols-[auto_1fr] gap-x-4">
                    <span className="num row-span-2 grid h-10 w-10 place-items-center rounded-full text-sm text-bg" style={{ background: heat(0.4 + 0.6 * f.rate) }}>
                      {i + 1}
                    </span>
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="wide font-semibold">{REGION_LABELS[f.region]}</span>
                      <span className="text-sm text-dim">{f.sides.length === 2 ? "Both sides" : f.sides[0] === "right" ? "Right side" : "Left side"}</span>
                    </span>
                    <span className="text-sm text-dim">
                      {Array.from(new Set(fails.filter((x) => x.region === f.region).map((x) => x.compensation))).join(", ")}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="surface space-y-5 p-6 sm:p-8">
          <h2 className="wide text-xl font-bold">By movement</h2>
          {s.movements.map((m, i) => (
            <MovementBar key={m.key} label={m.label} pct={m.score.pct} skipped={m.skipped} delta={delta(m.score.pct, p?.movements[i]?.score.pct)} />
          ))}
        </div>

        <div className="surface p-6 sm:p-8">
          <h2 className="wide mb-5 text-xl font-bold">Every compensation found</h2>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {s.movements.map((m) => {
              const list = collapse(fails.filter((f) => f.movement === m.label));
              const note = scan.notes?.[m.key];
              return (
                <div key={m.key} className="border-t border-line pt-4">
                  <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="font-semibold">{m.label}</h3>
                    <span className="num text-sm" style={{ color: m.skipped ? undefined : scoreColor(m.score.pct) }}>
                      {m.skipped ? <span className="font-normal text-faint">Skipped</span> : `${Math.round(m.score.pct ?? 0)}%`}
                    </span>
                  </div>
                  {m.skipped ? null : list.length === 0 ? (
                    <p className="text-sm text-ice">Clean</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {list.map((f) => (
                        <li key={f.compensation} className="flex justify-between gap-3">
                          <span>{f.compensation}</span>
                          <span className="text-dim">{f.side}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {note && <p className="mt-2 text-sm italic text-dim">{note}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="flex flex-col items-center gap-1 pb-4 text-center">
        <p className="text-dim">Next retest</p>
        <p className="wide text-2xl font-bold">{due}</p>
      </footer>
    </article>
  );
}
