"use client";

import { useMemo, useState } from "react";
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

// What each compensation prescribes. Every scan builds its corrective program from this map.
export default function CorrectiveMap() {
  const { settings, save } = useSettings();
  const [q, setQ] = useState("");
  const mapping = useMemo(() => settings?.mapping ?? DEFAULT_MAPPING, [settings]);
  if (!settings) return null;
  const custom = settings.mapping !== null;
  const update = (comp: string, keys: string[]) => save({ mapping: { ...mapping, [comp]: keys } });
  const comps = COMPS.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-[15px] text-dim">
          {custom ? "This is your gym's own system. Every scan builds its corrective program from it." : "You're on the starter map. Change any compensation and it becomes your gym's own system."}
        </p>
        <div className="flex items-center gap-3">
          {custom && (
            <button className="btn btn-text text-sm" onClick={() => confirm("Reset every compensation back to the starter map?") && save({ mapping: null })}>
              Reset to starter
            </button>
          )}
          <input className="field !min-h-10 w-56 !text-sm" placeholder="Filter compensations" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter compensations" />
        </div>
      </div>
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
                    <span key={k} className="inline-flex items-center gap-2 rounded-[10px] bg-white/[0.05] py-1.5 pl-3 pr-1.5 text-sm">
                      <span className="text-faint">{PHASES.find((p) => p.key === e.phase)!.label}</span>
                      {e.name}
                      <button aria-label={`Remove ${e.name}`} className="grid h-6 w-6 place-items-center rounded-md text-faint hover:bg-white/10 hover:text-ink" onClick={() => update(c.key, keys.filter((x) => x !== k))}>
                        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                          <path d="M2 2l6 6M8 2 2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </button>
                    </span>
                  );
                })}
                <select className="field !min-h-9 !w-auto !rounded-[10px] !py-0 !pl-3 !pr-9 !text-sm text-dim" value="" onChange={(e) => e.target.value && update(c.key, [...keys, e.target.value])} aria-label={`Add an exercise for ${c.label}`}>
                  <option value="">Add exercise</option>
                  {PHASES.map((p) => (
                    <optgroup key={p.key} label={p.label}>
                      {available.filter((e) => e.phase === p.key).map((e) => (
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
    </div>
  );
}
