"use client";

import { useMemo, useState } from "react";
import { store } from "@/lib/store";
import { isDone, newId, type Assignment, type Program, type Session, type WorkoutLog } from "@/lib/training";
import { addDays, fullName, mondayOf, todayISO, type Client } from "@/lib/types";
import { Avatar, Check, Field, Sheet } from "./ui";

// Seven days, Monday first. Filled = done, ring = coming up, red ring = missed, blank = rest day.
export function WeekStrip({ sessions, logs, monday, size = "md" }: { sessions: Session[]; logs: Map<string, WorkoutLog>; monday?: string; size?: "sm" | "md" }) {
  const today = todayISO();
  const start = monday ?? mondayOf(today);
  const dot = size === "sm" ? "h-6 w-6" : "h-9 w-9";
  return (
    <div className="grid grid-cols-7 gap-1 text-center">
      {Array.from({ length: 7 }, (_, i) => {
        const date = addDays(start, i);
        const mine = sessions.filter((s) => s.date === date);
        const done = mine.length > 0 && mine.every((s) => isDone(s, logs));
        const missed = mine.length > 0 && !done && date < today;
        return (
          <div key={date} className="flex flex-col items-center gap-1.5">
            <span className={`text-[11px] ${date === today ? "font-semibold text-ink" : "text-faint"}`}>{"MTWTFSS"[i]}</span>
            <span
              className={`grid place-items-center rounded-full text-bg ${dot} ${
                done ? "bg-ice" : missed ? "shadow-[inset_0_0_0_1.5px_var(--color-hot)]" : mine.length ? "shadow-[inset_0_0_0_1.5px_var(--color-dim)]" : date === today ? "bg-white/[0.06]" : ""
              }`}
              title={mine.map((s) => s.day.name).join(", ") || "Rest"}
            >
              {done && <Check size={size === "sm" ? 11 : 14} />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Give a program to athletes. It replaces whatever program each athlete is on now.
export function AssignSheet({ open, onClose, program, clients, preset, onDone }: { open: boolean; onClose: () => void; program: Program; clients: Client[]; preset?: string[]; onDone: (n: number) => void }) {
  const nextMonday = useMemo(() => {
    const t = todayISO();
    const m = mondayOf(t);
    return m === t ? t : addDays(m, 7);
  }, []);
  const [picked, setPicked] = useState<Set<string>>(new Set(preset ?? []));
  const [start, setStart] = useState(nextMonday);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const list = clients.filter((c) => fullName(c).toLowerCase().includes(q.toLowerCase()));

  async function assign() {
    setBusy(true);
    const existing = await store.list("assignment");
    for (const id of picked) {
      for (const old of existing.filter((a) => a.client_id === id && a.status === "active")) await store.put("assignment", { ...old, status: "ended" });
      const a: Assignment = { id: newId(), client_id: id, program_id: program.id, program, start: mondayOf(start), weeks: program.weeks, status: "active", created_at: new Date().toISOString() };
      await store.put("assignment", a);
    }
    setBusy(false);
    onDone(picked.size);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Assign ${program.name}`}>
      <div className="space-y-4">
        <Field label="Starts the week of" hint="Programs run Monday to Sunday. It replaces the athlete's current program.">
          <input type="date" className="field" value={start} onChange={(e) => setStart(e.target.value || nextMonday)} />
        </Field>
        {!preset && (
          <>
            <input className="field" placeholder="Find an athlete" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find an athlete" />
            <ul className="max-h-64 overflow-y-auto rounded-[12px] bg-black/20">
              {list.map((c) => {
                const on = picked.has(c.id);
                return (
                  <li key={c.id}>
                    <button
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.04]"
                      onClick={() =>
                        setPicked((p) => {
                          const n = new Set(p);
                          if (on) n.delete(c.id);
                          else n.add(c.id);
                          return n;
                        })
                      }
                      aria-pressed={on}
                    >
                      <Avatar who={c} size={32} />
                      <span className="flex-1">{fullName(c)}</span>
                      <span className={`grid h-6 w-6 place-items-center rounded-full text-bg ${on ? "bg-paper" : "shadow-[inset_0_0_0_1.5px_var(--color-line)]"}`}>{on && <Check size={12} />}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <button className="btn btn-primary w-full" disabled={picked.size === 0 || busy} onClick={assign}>
          {picked.size === 0 ? "Choose athletes" : `Assign to ${picked.size} ${picked.size === 1 ? "athlete" : "athletes"}`}
        </button>
      </div>
    </Sheet>
  );
}
