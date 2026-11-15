"use client";

import { REGION_LABELS, type Region } from "@/lib/battery";
import { buildProgram } from "@/lib/program";
import { failedCompensations, scoreScan } from "@/lib/scoring";
import type { Scan } from "@/lib/types";
import { PageHeader } from "./AppShell";
import ProgramView from "./ProgramView";
import { BodyMap, Delta, Dial, heat, MovementBar, scoreColor } from "./viz";

const sideLabel = { R: "Right", L: "Left", W: "Whole body" } as const;

export default function ResultsView({
  scan,
  name,
  previous,
  actions,
  mapping,
  theme = "dark",
  audience = "trainer",
}: {
  scan: Scan;
  name: string;
  previous?: Scan | null;
  actions?: React.ReactNode;
  mapping?: Record<string, string[]> | null;
  theme?: "dark" | "light";
  audience?: "trainer" | "athlete";
}) {
  const s = scoreScan(scan);
  const p = previous ? scoreScan(previous) : null;
  const delta = (a: number | null, b: number | null | undefined) => (a === null || b == null ? null : a - b);
  const fails = failedCompensations(scan.fails);
  const program = buildProgram(scan.fails, mapping ?? undefined);
  const totalDelta = delta(s.total.pct, p?.total.pct);

  const failsByRegion: Partial<Record<Region, { label: string; side: string }[]>> = {};
  for (const f of fails) (failsByRegion[f.region] ??= []).push({ label: `${f.compensation} (${f.movement})`, side: sideLabel[f.side] });

  const focus = (Object.entries(s.regions) as [Region, (typeof s.regions)[Region]][])
    .map(([region, r]) => {
      const possible = r.R.possible + r.L.possible;
      const failed = possible - r.R.passed - r.L.passed;
      const right = r.R.passed < r.R.possible;
      const left = r.L.passed < r.L.possible;
      return { region, rate: possible ? failed / possible : 0, side: right && left ? "Both sides" : right ? "Right side" : "Left side" };
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
  const you = audience === "athlete";

  return (
    <article>
      <PageHeader eyebrow={`Movement scan, ${date}`} title={name}>
        {actions}
      </PageHeader>

      <section className="surface reveal grid overflow-hidden lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="flex flex-col justify-center border-b border-hair px-3 py-8 sm:px-8 lg:border-b-0 lg:border-r">
          <BodyMap regions={s.regions} failsByRegion={failsByRegion} theme={theme} animate />
        </div>

        <div className="flex flex-col">
          <div className="px-6 pb-8 pt-8 sm:px-10 sm:pt-10">
            <p className="text-[15px] text-dim">Movement efficiency</p>
            <div className="mt-3 flex items-end gap-4">
              <span className="readout text-[7.5rem] sm:text-[9rem]" style={{ color: scoreColor(s.total.pct) }}>
                {Math.round(s.total.pct ?? 0)}
              </span>
              <span className="mb-4 text-2xl font-light text-dim">/ 100</span>
            </div>
            <p className="mt-4 text-[15px] text-dim">
              {totalDelta !== null && Math.abs(totalDelta) >= 0.5 ? (
                <>
                  <Delta d={totalDelta} className="mr-1.5" />
                  points since {new Date(previous!.performed_at).toLocaleDateString(undefined, { month: "long", day: "numeric" })}
                </>
              ) : (
                `${s.total.passed} of ${s.total.possible} checks passed`
              )}
            </p>
          </div>

          <div className="grid grid-cols-3 border-y border-hair px-2 py-6 sm:px-6">
            <Dial pct={s.right.pct} label="Right side" size={104} delta={delta(s.right.pct, p?.right.pct)} />
            <Dial pct={s.left.pct} label="Left side" size={104} delta={delta(s.left.pct, p?.left.pct)} />
            <Dial pct={s.synergistic.pct} label="Whole body" size={104} delta={delta(s.synergistic.pct, p?.synergistic.pct)} />
          </div>

          <div className="flex-1 px-6 py-8 sm:px-10">
            <h2 className="mb-5 text-lg font-semibold">{you ? "Where to focus" : "Focus areas"}</h2>
            {focus.length === 0 ? (
              <p className="text-ice">No compensations found. A clean scan.</p>
            ) : (
              <ol className="space-y-5">
                {focus.map((f) => (
                  <li key={f.region} className="grid grid-cols-[10px_1fr] gap-x-4">
                    <span className="mt-[7px] h-2.5 w-2.5 rounded-full" style={{ background: heat(0.45 + 0.55 * f.rate), boxShadow: `0 0 12px ${heat(0.45 + 0.55 * f.rate, 0.7)}` }} />
                    <div>
                      <p className="flex items-baseline justify-between gap-3">
                        <span className="font-medium">{REGION_LABELS[f.region]}</span>
                        <span className="text-sm text-dim">{f.side}</span>
                      </p>
                      <p className="mt-0.5 text-sm text-dim">
                        {Array.from(new Set(fails.filter((x) => x.region === f.region).map((x) => x.compensation))).join(", ")}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      <section className="surface mt-6 px-6 py-8 sm:px-10 sm:py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="title text-3xl">{you ? "Your program" : "Corrective program"}</h2>
            <p className="mt-2 text-dim">
              {program.count > 0
                ? `${program.count} exercises in four phases, built from ${you ? "your" : "this"} scan. About 20 minutes, 3 times a week.`
                : "Nothing to correct on this scan."}
            </p>
          </div>
        </div>
        <ProgramView program={program} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div className="surface space-y-6 px-6 py-8 sm:px-8">
          <h2 className="text-lg font-semibold">By movement</h2>
          {s.movements.map((m, i) => (
            <MovementBar key={m.key} label={m.label} pct={m.score.pct} skipped={m.skipped} delta={delta(m.score.pct, p?.movements[i]?.score.pct)} />
          ))}
        </div>

        <div className="surface px-6 py-8 sm:px-8">
          <h2 className="mb-6 text-lg font-semibold">Every compensation found</h2>
          <div className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {s.movements.map((m) => {
              const list = collapse(fails.filter((f) => f.movement === m.label));
              const note = scan.notes?.[m.key];
              return (
                <div key={m.key}>
                  <div className="mb-2 flex items-baseline justify-between border-b border-hair pb-2">
                    <h3 className="font-medium">{m.label}</h3>
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

      <footer className="mt-14 flex flex-col items-center gap-1 text-center">
        <p className="text-dim">{you ? "Your next scan" : "Next retest"}</p>
        <p className="text-2xl font-medium tracking-tight">{due}</p>
      </footer>
    </article>
  );
}
