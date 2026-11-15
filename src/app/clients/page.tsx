"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell, { Loading } from "@/components/AppShell";
import { scoreColor } from "@/components/viz";
import { store } from "@/lib/store";
import { ageFromDob, fullName, retestStatus, type Client, type Scan } from "@/lib/types";

function Clients() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    store.listClients().then(setClients);
    store.listScans().then(setScans);
  }, []);

  const latest = useMemo(() => {
    const m: Record<string, Scan> = {};
    for (const s of scans) m[s.client_id] ??= s;
    return m;
  }, [scans]);
  const count = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of scans) m[s.client_id] = (m[s.client_id] ?? 0) + 1;
    return m;
  }, [scans]);

  if (clients === null) return <Loading />;
  const list = clients.filter((c) => fullName(c).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-8">
      <header className="mb-2 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="title text-[2.5rem] sm:text-[3.5rem]">Athletes</h1>
          <p className="mt-3 text-lg text-dim">
            {clients.length} {clients.length === 1 ? "athlete" : "athletes"} on file
          </p>
        </div>
        <Link href="/scan/new" className="btn btn-primary">
          Add an athlete
        </Link>
      </header>

      <input className="field !min-h-12" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search athletes" />

      {list.length === 0 ? (
        <p className="surface p-6 text-dim">{q ? `No one matches “${q}”.` : "No athletes yet. Start a scan to add your first one."}</p>
      ) : (
        <ul className="surface divide-y divide-[var(--color-hair)] overflow-hidden">
          {list.map((c) => {
            const s = latest[c.id];
            const st = s ? retestStatus(s.retest_due) : null;
            const age = ageFromDob(c.dob);
            const meta = [age !== null && `${age}`, c.sport, s && `${count[c.id]} ${count[c.id] === 1 ? "scan" : "scans"}`].filter(Boolean).join(", ");
            return (
              <li key={c.id}>
                <Link href={`/clients/${c.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03] sm:px-8">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-raised text-sm font-semibold text-dim">
                    {(c.first_name[0] ?? "") + (c.last_name.replace(/[^a-z]/gi, "")[0] ?? "")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{fullName(c)}</span>
                    <span className="block truncate text-sm text-dim">{meta || "No scans yet"}</span>
                  </span>
                  {st && st !== "ok" && (
                    <span className={`hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline ${st === "overdue" ? "bg-hot/15 text-hot" : "bg-amber/15 text-amber"}`}>
                      {st === "overdue" ? "Retest overdue" : "Retest due"}
                    </span>
                  )}
                  {s && (
                    <span className="readout w-14 text-right text-3xl" style={{ color: scoreColor(Number(s.total_pct)) }}>
                      {Math.round(Number(s.total_pct))}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Clients />
    </AppShell>
  );
}
