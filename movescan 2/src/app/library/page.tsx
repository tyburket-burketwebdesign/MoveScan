"use client";

import { useMemo, useState } from "react";
import AppShell, { Loading, PageHeader } from "@/components/AppShell";
import { DEFAULT_BATTERY } from "@/lib/battery";
import { DEFAULT_MAPPING, EX_BY_KEY, EXERCISES, PHASES } from "@/lib/program";
import { useSettings } from "@/lib/useSettings";

// Compensations are mapped once by key, so list each one with the tests it appears in.
const COMPS = (() => {
  const m = new Map<string, { key: string; label: string; tests: string[] }>();
  for (const mv of DEFAULT_BATTERY)
    for (const c of mv.compensations) {
      const e = m.get(c.key) ?? { key: c.key, label: c.label, tests: [] };
      e.tests.push(mv.label);
      m.set(c.key, e);
    }
  return [...m.values()];
})();

function Library() {
  const { settings, save } = useSettings();
  const [tab, setTab] = useState<"map" | "library">("map");
  const [q, setQ] = useState("");
  const mapping = useMemo(() => settings?.mapping ?? DEFAULT_MAPPING, [settings]);

  if (!settings) return <Loading />;
  const custom = settings.mapping !== null;

  const update = (comp: string, keys: string[]) => save({ mapping: { ...mapping, [comp]: keys } });
  const comps = COMPS.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Programs"
        sub="What each compensation prescribes. Every scan builds its program from this map."
      >
        {custom && (
          <button
            className="btn btn-text"
            onClick={() => {
              if (confirm("Reset every compensation back to the starter library?")) save({ mapping: null });
            }}
          >
            Reset to starter
          </button>
        )}
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-[12px] bg-white/[0.04] p-1" role="tablist">
          {[
            ["map", "Compensation map"],
            ["library", `Exercise library (${EXERCISES.length})`],
          ].map(([k, l]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k as typeof tab)}
              className={`rounded-[9px] px-4 py-2 text-sm transition-colors ${tab === k ? "bg-raised text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" : "text-dim hover:text-ink"}`}
            >
              {l}
            </button>
          ))}
        </div>
        {tab === "map" && <input className="field !min-h-10 max-w-64 !text-sm" placeholder="Filter compensations" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter compensations" />}
      </div>

      {!custom && (
        <p className="mb-6 rounded-[14px] border border-hair px-5 py-4 text-[15px] text-dim">
          You&apos;re using the starter library. Change any compensation below and it becomes your gym&apos;s own system.
        </p>
      )}

      {tab === "map" ? (
        <div className="surface divide-y divide-[var(--color-hair)]">
          {comps.map((c) => {
            const keys = mapping[c.key] ?? [];
            const available = EXERCISES.filter((e) => !keys.includes(e.key));
            return (
              <div key={c.key} className="grid gap-4 px-6 py-5 sm:px-8 lg:grid-cols-[240px_1fr]">
                <div>
                  <p className="font-medium">{c.label}</p>
                  <p className="text-sm text-faint">{c.tests.join(", ")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {keys.map((k) => {
                    const e = EX_BY_KEY[k];
                    if (!e) return null;
                    return (
                      <span key={k} className="group inline-flex items-center gap-2 rounded-[10px] bg-white/[0.05] py-1.5 pl-3 pr-1.5 text-sm">
                        <span className="text-faint">{PHASES.find((p) => p.key === e.phase)!.label}</span>
                        {e.name}
                        <button
                          aria-label={`Remove ${e.name}`}
                          className="grid h-6 w-6 place-items-center rounded-md text-faint hover:bg-white/10 hover:text-ink"
                          onClick={() => update(c.key, keys.filter((x) => x !== k))}
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                            <path d="M2 2l6 6M8 2 2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>
                        </button>
                      </span>
                    );
                  })}
                  <select
                    className="field !min-h-9 !w-auto !rounded-[10px] !py-0 !pl-3 !pr-9 !text-sm text-dim"
                    value=""
                    onChange={(e) => e.target.value && update(c.key, [...keys, e.target.value])}
                    aria-label={`Add an exercise for ${c.label}`}
                  >
                    <option value="">Add exercise</option>
                    {PHASES.map((p) => (
                      <optgroup key={p.key} label={p.label}>
                        {available
                          .filter((e) => e.phase === p.key)
                          .map((e) => (
                            <option key={e.key} value={e.key}>
                              {e.name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {PHASES.map((p, i) => (
            <section key={p.key} className="surface px-6 py-7 sm:px-8">
              <div className="mb-5 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold">
                  <span className="mr-2 text-faint">{i + 1}</span>
                  {p.label}
                </h2>
                <span className="text-sm text-dim">{p.dose}</span>
              </div>
              <p className="-mt-3 mb-5 text-sm text-faint">{p.blurb}</p>
              <ul className="space-y-4">
                {EXERCISES.filter((e) => e.phase === p.key).map((e) => (
                  <li key={e.key} className="grid grid-cols-[56px_1fr] gap-4">
                    <span className="grid aspect-square place-items-center rounded-[10px] bg-white/[0.04] text-faint" title="Video slot">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M8 5.5v13l11-6.5z" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-medium">{e.name}</p>
                      <p className="text-sm text-dim">{e.cue}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Library />
    </AppShell>
  );
}
