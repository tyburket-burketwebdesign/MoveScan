"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Ring, Sheet, toEmbed, VideoFrame } from "@/components/ui";
import { blankLog, prescription, type LibraryExercise, type Session, type WorkoutLog } from "@/lib/training";
import { fmtDate } from "@/lib/types";

// One training session, full screen. Athletes tap off each set, watch the demo when there is one,
// then finish with an effort rating and a note for their trainer.
export default function WorkoutPlayer({
  session,
  existing,
  library,
  streakAfter,
  nextUp,
  onSave,
  onClose,
}: {
  session: Session;
  existing: WorkoutLog | undefined;
  library: Record<string, LibraryExercise>;
  streakAfter: number;
  nextUp: Session | null;
  onSave: (log: WorkoutLog) => Promise<void>;
  onClose: () => void;
}) {
  const [log, setLog] = useState<WorkoutLog>(existing ?? blankLog(session));
  const [watching, setWatching] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [rpe, setRpe] = useState<number | null>(existing?.rpe ?? null);
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(log);

  const items = session.day.items;
  const totals = useMemo(() => {
    const sets = items.reduce((t, i) => t + i.sets, 0);
    const done = items.reduce((t, i) => t + Math.min(i.sets, log.done[i.id] ?? 0), 0);
    return { sets, done, exercisesDone: items.filter((i) => (log.done[i.id] ?? 0) >= i.sets).length };
  }, [items, log]);
  const wasComplete = Boolean(existing?.completed_at);

  // Check-offs save themselves a moment after the last tap, and again on the way out.
  const persist = (next: WorkoutLog) => {
    latest.current = next;
    setLog(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      onSave(next).catch((e) => setError(e.message));
    }, 500);
  };
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        onSave(latest.current).catch(() => {});
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const tapSet = (itemId: string, n: number) => {
    const cur = log.done[itemId] ?? 0;
    persist({ ...log, done: { ...log.done, [itemId]: cur >= n ? n - 1 : n } });
  };

  async function finish() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const done: WorkoutLog = { ...log, completed_at: new Date().toISOString(), rpe, note: note.trim() };
    latest.current = done;
    setLog(done);
    try {
      await onSave(done);
      setFinishing(false);
      setCelebrate(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save. Try again.");
    }
  }

  if (celebrate)
    return (
      <div className="fade fixed inset-0 z-40 mx-auto flex max-w-[480px] flex-col items-center justify-center bg-bg px-8 text-center">
        <span className="pop grid h-24 w-24 place-items-center rounded-full bg-ice text-bg" style={{ boxShadow: "0 0 60px color-mix(in srgb, var(--color-ice) 45%, transparent)" }}>
          <Check size={40} />
        </span>
        <h1 className="title mt-8 text-4xl">Session complete</h1>
        <p className="mt-3 text-dim">{session.day.name} is in the books. Your trainer can see it.</p>
        <dl className="mt-10 grid w-full grid-cols-3 gap-3">
          {[
            [totals.done, "sets"],
            [totals.exercisesDone, "exercises"],
            [streakAfter, "in a row"],
          ].map(([v, l]) => (
            <div key={l as string} className="rounded-[16px] bg-surface py-5">
              <dd className="readout text-4xl">{v}</dd>
              <dt className="mt-2 text-sm text-dim">{l}</dt>
            </div>
          ))}
        </dl>
        {nextUp && (
          <p className="mt-8 text-sm text-dim">
            Next up: {nextUp.day.name}, {fmtDate(nextUp.date, { weekday: "long" })}
          </p>
        )}
        <button className="btn btn-primary mt-10 w-full !min-h-14 text-base" onClick={onClose}>
          Done
        </button>
      </div>
    );

  return (
    <div className="sheet fixed inset-0 z-40 mx-auto flex max-w-[480px] flex-col bg-bg">
      <header className="flex items-center gap-4 border-b border-hair px-5 pb-4" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <button onClick={onClose} aria-label="Close session" className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-dim hover:bg-white/5 hover:text-ink">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m15 5-7 7 7 7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-dim">
            {session.assignment.program.name}, week {session.week}
          </p>
          <h1 className="truncate text-xl font-semibold tracking-tight">{session.day.name}</h1>
        </div>
        <Ring pct={totals.sets ? (totals.done / totals.sets) * 100 : 0} size={46} stroke={3.5}>
          <span className="num text-[11px]">
            {totals.done}/{totals.sets}
          </span>
        </Ring>
      </header>

      <ol className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {items.map((it, idx) => {
          const ex = library[it.exercise];
          const done = Math.min(it.sets, log.done[it.id] ?? 0);
          const complete = done >= it.sets;
          const hasVideo = Boolean(toEmbed(ex?.videoUrl));
          return (
            <li key={it.id} className={`rounded-[18px] p-5 transition-colors ${complete ? "bg-surface/50" : "bg-surface"}`}>
              <div className="flex items-start gap-3.5">
                <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${complete ? "bg-ice text-bg" : "bg-white/[0.06] text-dim"}`}>{complete ? <Check size={12} /> : idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <h2 className={`text-[17px] font-semibold leading-snug ${complete ? "text-dim" : ""}`}>{ex?.name ?? "Exercise"}</h2>
                  <p className="mt-0.5 text-[15px] text-dim">
                    {prescription(it)}
                    {it.rest ? `, rest ${it.rest}` : ""}
                  </p>
                </div>
              </div>

              {!complete && (ex?.cue || it.note) && (
                <div className="mt-3 space-y-1 pl-[42px] text-sm">
                  {it.note && <p className="text-ink">{it.note}</p>}
                  {ex?.cue && <p className="text-faint">{ex.cue}</p>}
                </div>
              )}

              {hasVideo && !complete && (
                <div className="mt-3 pl-[42px]">
                  {watching === it.id ? (
                    <VideoFrame url={ex!.videoUrl} title={ex!.name} />
                  ) : (
                    <button className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] py-1.5 pl-2.5 pr-3.5 text-sm hover:bg-white/[0.1]" onClick={() => setWatching(it.id)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-ice" aria-hidden>
                        <path d="M8 5.5v13l11-6.5z" />
                      </svg>
                      Watch the demo
                    </button>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2 pl-[42px]">
                {Array.from({ length: it.sets }, (_, s) => {
                  const on = s < done;
                  return (
                    <button
                      key={s}
                      onClick={() => tapSet(it.id, s + 1)}
                      aria-pressed={on}
                      aria-label={`Set ${s + 1}${on ? ", done" : ""}`}
                      className={`grid h-11 w-11 place-items-center rounded-full text-sm font-semibold transition-[background-color,transform] duration-150 active:scale-90 ${on ? "bg-ice text-bg" : "text-dim shadow-[inset_0_0_0_1.5px_var(--color-line)]"}`}
                    >
                      {on ? <Check size={15} /> : s + 1}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      <footer className="border-t border-hair bg-bg/95 px-4 pt-3 backdrop-blur" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        {error && <p className="mb-2 text-center text-sm text-hot">{error}</p>}
        {wasComplete ? (
          <button className="btn btn-quiet w-full !min-h-14 text-base" onClick={onClose}>
            Completed {fmtDate(existing!.completed_at!, { month: "short", day: "numeric" })}
          </button>
        ) : (
          <button className="btn btn-primary w-full !min-h-14 text-base" onClick={() => setFinishing(true)} disabled={totals.done === 0}>
            {totals.done === 0 ? "Tap a set to begin" : totals.done >= totals.sets ? "Finish session" : `Finish with ${totals.done} of ${totals.sets} sets`}
          </button>
        )}
      </footer>

      <Sheet open={finishing} onClose={() => setFinishing(false)} title="How did that feel?">
        <div className="space-y-5">
          <div>
            <p className="mb-3 text-sm text-dim">Effort, 1 is easy and 10 is all out</p>
            <div className="grid grid-cols-10 gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setRpe(n)} aria-pressed={rpe === n} className={`grid aspect-square place-items-center rounded-[10px] text-sm font-semibold ${rpe === n ? "bg-paper text-bg" : "bg-white/[0.06] text-dim"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <textarea className="field" placeholder="Anything your trainer should know? (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn btn-primary w-full !min-h-14 text-base" onClick={finish}>
            Save session
          </button>
        </div>
      </Sheet>
    </div>
  );
}
