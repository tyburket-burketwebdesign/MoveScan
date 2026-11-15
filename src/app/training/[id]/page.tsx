"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import AppShell, { Loading } from "@/components/AppShell";
import { AssignSheet } from "@/components/TrainingBits";
import { Pill, Segmented, Sheet, toEmbed } from "@/components/ui";
import { store } from "@/lib/store";
import { CATEGORIES, estMinutes, exerciseIndex, item, mergeLibrary, newId, type Category, type Program, type ProgramDay, type ProgramItem } from "@/lib/training";
import { WEEKDAYS, type Client } from "@/lib/types";

function Builder() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const assignTo = useSearchParams().get("assign");
  const [program, setProgram] = useState<Program | null | undefined>(undefined);
  const [clients, setClients] = useState<Client[]>([]);
  const [custom, setCustom] = useState<Parameters<typeof mergeLibrary>[0]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [pickFor, setPickFor] = useState<string | null>(null); // day id receiving an exercise
  const [assigning, setAssigning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Program | null>(null);
  // Leaving the page mid-keystroke still saves the last edit.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current) store.put("program", pending.current);
    },
    [],
  );

  useEffect(() => {
    store.get("program", id).then(setProgram);
    store.listClients().then((c) => setClients(c.filter((x) => !x.archived)));
    store.list("exercise").then(setCustom);
    store.list("assignment").then((a) => setActiveCount(a.filter((x) => x.program_id === id && x.status === "active").length));
  }, [id]);
  useEffect(() => {
    if (assignTo && program) setAssigning(true);
  }, [assignTo, program]);

  const library = useMemo(() => mergeLibrary(custom), [custom]);
  const index = useMemo(() => exerciseIndex(library), [library]);

  if (program === undefined) return <Loading />;
  if (program === null)
    return (
      <div className="surface p-10">
        <p className="text-xl font-semibold">This program isn&apos;t here</p>
        <Link href="/training" className="btn btn-quiet mt-6">
          Back to Training
        </Link>
      </div>
    );

  // Every edit saves itself a moment after the trainer stops typing.
  const update = (next: Program) => {
    setProgram(next);
    setSaved("saving");
    pending.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      pending.current = null;
      await store.put("program", next);
      setSaved("saved");
    }, 350);
  };
  const setDay = (dayId: string, fn: (d: ProgramDay) => ProgramDay) => update({ ...program, days: program.days.map((d) => (d.id === dayId ? fn(d) : d)) });
  const setItem = (dayId: string, itemId: string, patch: Partial<ProgramItem>) => setDay(dayId, (d) => ({ ...d, items: d.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }));
  const move = (dayId: string, idx: number, dir: -1 | 1) =>
    setDay(dayId, (d) => {
      const items = [...d.items];
      const j = idx + dir;
      if (j < 0 || j >= items.length) return d;
      [items[idx], items[j]] = [items[j], items[idx]];
      return { ...d, items };
    });
  const addDay = () => {
    const used = new Set(program.days.map((d) => d.weekday));
    const weekday = [0, 2, 4, 1, 3, 5, 6].find((w) => !used.has(w)) ?? 0;
    update({ ...program, days: [...program.days, { id: newId(), name: `Day ${program.days.length + 1}`, weekday, items: [] }] });
  };

  return (
    <div className="pb-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link href="/training" className="text-[15px] text-dim hover:text-ink">
          Training
        </Link>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="mr-1 text-sm text-faint" aria-live="polite">
            {saved === "saving" ? "Saving…" : saved === "saved" ? "Saved" : ""}
          </span>
          <button
            className="btn btn-text text-sm"
            onClick={async () => {
              if (!confirm(`Delete ${program.name}? Athletes already on it keep their copy.`)) return;
              if (timer.current) clearTimeout(timer.current);
              pending.current = null;
              await store.remove("program", program.id);
              router.push("/training");
            }}
          >
            Delete
          </button>
          <button
            className="btn btn-quiet"
            onClick={async () => {
              const copy: Program = { ...program, id: newId(), name: `${program.name} copy`, created_at: new Date().toISOString(), days: program.days.map((d) => ({ ...d, id: newId(), items: d.items.map((i) => ({ ...i, id: newId() })) })) };
              await store.put("program", copy);
              router.push(`/training/${copy.id}`);
            }}
          >
            Duplicate
          </button>
          <button className="btn btn-primary" onClick={() => setAssigning(true)} disabled={program.days.every((d) => d.items.length === 0)}>
            Assign to athletes
          </button>
        </div>
      </div>

      {notice && (
        <p className="mb-6 rounded-[14px] border border-hair bg-surface px-5 py-4 text-[15px]" role="status">
          {notice}
        </p>
      )}

      <header className="mb-10">
        <input className="ghost title -ml-2 w-full px-2 py-1 text-[1.7rem] sm:text-[3rem]" value={program.name} onChange={(e) => update({ ...program, name: e.target.value })} aria-label="Program name" />
        <textarea rows={2} className="ghost -ml-2 mt-1 block w-full resize-none px-2 py-1.5 text-[17px] text-dim" value={program.summary} placeholder="Describe who this is for and what it builds" onChange={(e) => update({ ...program, summary: e.target.value })} aria-label="Program description" />
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-[15px]">
          <label className="flex items-center gap-3">
            <span className="text-dim">Length</span>
            <span className="inline-flex items-center rounded-[10px] bg-white/[0.05]">
              <button className="grid h-9 w-9 place-items-center text-dim hover:text-ink" onClick={() => update({ ...program, weeks: Math.max(1, program.weeks - 1) })} aria-label="One week shorter">
                −
              </button>
              <span className="num w-20 text-center">
                {program.weeks} {program.weeks === 1 ? "week" : "weeks"}
              </span>
              <button className="grid h-9 w-9 place-items-center text-dim hover:text-ink" onClick={() => update({ ...program, weeks: Math.min(52, program.weeks + 1) })} aria-label="One week longer">
                +
              </button>
            </span>
          </label>
          <span className="text-dim">
            {program.days.length} {program.days.length === 1 ? "day" : "days"} a week, repeating
          </span>
          {activeCount > 0 && <Pill tone="good">{activeCount} athletes training on it</Pill>}
        </div>
        {activeCount > 0 && <p className="mt-3 text-sm text-faint">Changes here apply to new assignments. Athletes already on the program keep the version they were given.</p>}
      </header>

      <div className="grid gap-6">
        {program.days
          .slice()
          .sort((a, b) => a.weekday - b.weekday)
          .map((d) => (
            <section key={d.id} className="surface flex min-w-0 flex-col">
              <div className="flex items-center gap-3 border-b border-hair px-5 py-4 sm:px-6">
                <input className="ghost -ml-2 w-0 min-w-0 flex-1 px-2 py-1 text-lg font-semibold" value={d.name} onChange={(e) => setDay(d.id, (x) => ({ ...x, name: e.target.value }))} aria-label="Day name" />
                <select className="field !min-h-9 !w-auto !rounded-[10px] !pl-3 !pr-9 !text-sm" value={d.weekday} onChange={(e) => setDay(d.id, (x) => ({ ...x, weekday: Number(e.target.value) }))} aria-label="Weekday">
                  {WEEKDAYS.map((w, i) => (
                    <option key={w} value={i}>
                      {w}
                    </option>
                  ))}
                </select>
                <button
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-faint hover:bg-white/5 hover:text-hot"
                  aria-label={`Remove ${d.name}`}
                  onClick={() => (d.items.length === 0 || confirm(`Remove ${d.name} and its ${d.items.length} exercises?`)) && update({ ...program, days: program.days.filter((x) => x.id !== d.id) })}
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden>
                    <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {d.items.length > 0 && (
                <div className="hidden gap-2 px-6 pt-4 text-xs text-faint lg:grid lg:grid-cols-[minmax(0,1.2fr)_56px_100px_100px_88px_minmax(0,1fr)_84px]">
                  <span className="pl-8">Exercise</span>
                  <span className="text-center">Sets</span>
                  <span className="pl-2">Reps</span>
                  <span className="pl-2">Load</span>
                  <span className="pl-2">Rest</span>
                  <span className="pl-2">Note for the athlete</span>
                  <span />
                </div>
              )}
              <ul className="px-3 py-2 sm:px-4">
                {d.items.map((it, idx) => {
                  const ex = index[it.exercise];
                  return (
                    <li key={it.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[10px] px-2 py-2 hover:bg-white/[0.02] lg:grid-cols-[minmax(0,1.2fr)_56px_100px_100px_88px_minmax(0,1fr)_84px]">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="num w-5 shrink-0 text-sm text-faint">{idx + 1}</span>
                        <span className={`truncate font-medium ${ex ? "" : "text-faint line-through"}`}>{ex?.name ?? "Removed exercise"}</span>
                        {toEmbed(ex?.videoUrl) && (
                          <svg className="shrink-0 text-ice" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-label="Has a demo video">
                            <path d="M8 5.5v13l11-6.5z" />
                          </svg>
                        )}
                      </span>
                      <span className="flex justify-end gap-0.5 lg:order-last">
                        <button className="grid h-8 w-7 place-items-center rounded-md text-faint hover:bg-white/5 hover:text-ink disabled:opacity-20" disabled={idx === 0} onClick={() => move(d.id, idx, -1)} aria-label="Move up">
                          ↑
                        </button>
                        <button className="grid h-8 w-7 place-items-center rounded-md text-faint hover:bg-white/5 hover:text-ink disabled:opacity-20" disabled={idx === d.items.length - 1} onClick={() => move(d.id, idx, 1)} aria-label="Move down">
                          ↓
                        </button>
                        <button className="grid h-8 w-7 place-items-center rounded-md text-faint hover:bg-white/5 hover:text-hot" onClick={() => setDay(d.id, (x) => ({ ...x, items: x.items.filter((i) => i.id !== it.id) }))} aria-label={`Remove ${ex?.name ?? "exercise"}`}>
                          ×
                        </button>
                      </span>
                      <span className="col-span-2 grid grid-cols-[repeat(4,minmax(0,1fr))] gap-2 pl-8 lg:contents">
                        <input className="ghost num min-w-0 bg-white/[0.04] px-2 py-1.5 text-center text-sm" inputMode="numeric" value={it.sets} onChange={(e) => setItem(d.id, it.id, { sets: Math.max(1, Math.min(20, Number(e.target.value.replace(/\D/g, "")) || 1)) })} aria-label="Sets" />
                        <input className="ghost min-w-0 bg-white/[0.04] px-2 py-1.5 text-sm" value={it.reps} placeholder="Reps" onChange={(e) => setItem(d.id, it.id, { reps: e.target.value })} aria-label="Reps" />
                        <input className="ghost min-w-0 bg-white/[0.04] px-2 py-1.5 text-sm" value={it.load} placeholder="Load" onChange={(e) => setItem(d.id, it.id, { load: e.target.value })} aria-label="Load" />
                        <input className="ghost min-w-0 bg-white/[0.04] px-2 py-1.5 text-sm" value={it.rest} placeholder="Rest" onChange={(e) => setItem(d.id, it.id, { rest: e.target.value })} aria-label="Rest" />
                      </span>
                      <input className="ghost col-span-2 ml-8 min-w-0 px-2 py-1.5 text-sm text-dim lg:col-span-1 lg:ml-0" value={it.note} placeholder="Add a note" onChange={(e) => setItem(d.id, it.id, { note: e.target.value })} aria-label="Note for the athlete" />
                    </li>
                  );
                })}
              </ul>

              <div className="mt-auto flex items-center justify-between border-t border-hair px-5 py-3.5 sm:px-6">
                <button className="font-medium text-ice hover:underline" onClick={() => setPickFor(d.id)}>
                  Add exercise
                </button>
                <span className="text-sm text-faint">{d.items.length ? `About ${estMinutes(d)} min` : "Empty"}</span>
              </div>
            </section>
          ))}

        {program.days.length < 7 && (
          <button className="grid min-h-24 place-items-center rounded-[18px] border border-dashed border-line text-dim transition-colors hover:border-dim hover:text-ink" onClick={addDay}>
            Add a training day
          </button>
        )}
      </div>

      <ExercisePicker
        open={!!pickFor}
        library={library}
        onClose={() => setPickFor(null)}
        onPick={(key) => pickFor && setDay(pickFor, (x) => ({ ...x, items: [...x.items, item(key, 3, "8")] }))}
      />
      {assigning && (
        <AssignSheet
          open
          onClose={() => setAssigning(false)}
          program={program}
          clients={assignTo ? clients.filter((c) => c.id === assignTo) : clients}
          preset={assignTo ? [assignTo] : undefined}
          onDone={(n) => {
            setActiveCount((c) => c + n);
            setNotice(`Assigned to ${n} ${n === 1 ? "athlete" : "athletes"}. It's in their app now.`);
          }}
        />
      )}
    </div>
  );
}

function ExercisePicker({ open, onClose, library, onPick }: { open: boolean; onClose: () => void; library: ReturnType<typeof mergeLibrary>; onPick: (key: string) => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");
  const [added, setAdded] = useState<string[]>([]);
  useEffect(() => {
    if (open) setAdded([]);
  }, [open]);
  const shown = library.filter((x) => (cat === "All" || x.category === cat) && x.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Sheet open={open} onClose={onClose} title="Add exercises" wide>
      <div className="space-y-4">
        <input className="field" placeholder="Search the library" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the library" autoFocus />
        <Segmented value={cat} onChange={setCat} label="Category" options={[["All", "All"], ...CATEGORIES.map((c) => [c, c] as [Category, string])]} />
        <ul className="h-[46dvh] overflow-y-auto rounded-[12px] bg-black/20">
          {shown.map((x) => {
            const n = added.filter((k) => k === x.key).length;
            return (
              <li key={x.key}>
                <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04]" onClick={() => (onPick(x.key), setAdded((a) => [...a, x.key]))}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{x.name}</span>
                    <span className="block truncate text-sm text-dim">{x.category}</span>
                  </span>
                  {n > 0 ? <Pill tone="good">Added{n > 1 ? ` ×${n}` : ""}</Pill> : <span className="text-sm text-ice">Add</span>}
                </button>
              </li>
            );
          })}
          {shown.length === 0 && <li className="px-4 py-6 text-dim">Nothing matches. Create it in the exercise library first.</li>}
        </ul>
        <button className="btn btn-primary w-full" onClick={onClose}>
          {added.length ? `Done, ${added.length} added` : "Done"}
        </button>
      </div>
    </Sheet>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <Builder />
      </Suspense>
    </AppShell>
  );
}
