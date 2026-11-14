"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
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

  const list = (clients ?? []).filter((c) => fullName(c).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Clients</h1>
        <span className="font-mono text-sm text-dim">{clients?.length ?? 0} total</span>
      </div>
      <input className="field" placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="panel divide-y divide-line">
        {clients === null ? (
          <p className="p-4 text-dim">Loading…</p>
        ) : list.length === 0 ? (
          <p className="p-4 text-dim">No clients found.</p>
        ) : (
          list.map((c) => {
            const s = latest[c.id];
            const st = s ? retestStatus(s.retest_due) : null;
            const age = ageFromDob(c.dob);
            return (
              <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-panel-2">
                <div>
                  <div className="font-medium">{fullName(c)}</div>
                  <div className="text-sm text-dim">
                    {[age !== null && `${age} yrs`, c.sport, s && `last scan ${new Date(s.performed_at).toLocaleDateString()}`].filter(Boolean).join(" · ") || "No scans yet"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {st && st !== "ok" && (
                    <span className={`rounded-full px-2 py-0.5 font-mono text-xs ${st === "overdue" ? "bg-bad/15 text-bad" : "bg-warn/15 text-warn"}`}>
                      {st === "overdue" ? "retest overdue" : "retest due"}
                    </span>
                  )}
                  {s && (
                    <span className="font-mono text-lg" style={{ color: scoreColor(Number(s.total_pct)) }}>
                      {Math.round(Number(s.total_pct))}%
                    </span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
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
