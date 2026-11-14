"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { scoreColor } from "@/components/viz";
import { store } from "@/lib/store";
import { fullName, retestStatus, type Client, type Scan } from "@/lib/types";

function Home() {
  const [clients, setClients] = useState<Client[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    store.listClients().then(setClients);
    store.listScans().then(setScans);
  }, []);

  const byId = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);

  // Only a client's latest scan drives their retest date.
  const latest = useMemo(() => {
    const seen = new Set<string>();
    return scans.filter((s) => (seen.has(s.client_id) ? false : (seen.add(s.client_id), true)));
  }, [scans]);

  const due = latest
    .map((s) => ({ s, status: retestStatus(s.retest_due) }))
    .filter((x) => x.status !== "ok")
    .sort((a, b) => a.s.retest_due.localeCompare(b.s.retest_due));

  const avg = latest.length ? latest.reduce((t, s) => t + Number(s.total_pct), 0) / latest.length : null;
  const matches = q ? clients.filter((c) => fullName(c).toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Link
          href="/scan/new"
          className="panel group relative flex min-h-48 flex-col justify-between overflow-hidden p-6 transition hover:border-accent"
        >
          <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-accent/10 blur-3xl transition group-hover:bg-accent/20" />
          <span className="label">Start</span>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">New scan</h1>
            <p className="mt-1 text-dim">New client or retest. Six movements, about ten minutes.</p>
          </div>
          <span className="btn btn-primary self-start">Begin →</span>
        </Link>

        <div className="grid grid-cols-3 gap-4 md:grid-cols-1">
          <Stat label="Clients" value={clients.length} />
          <Stat label="Scans" value={scans.length} />
          <Stat label="Avg score" value={avg === null ? "—" : `${Math.round(avg)}%`} color={avg === null ? undefined : scoreColor(avg)} />
        </div>
      </section>

      <div className="relative">
        <input className="field !min-h-14 text-lg" placeholder="Search clients…" value={q} onChange={(e) => setQ(e.target.value)} />
        {matches.length > 0 && (
          <div className="panel absolute inset-x-0 top-16 z-20 overflow-hidden">
            {matches.map((c) => (
              <Link key={c.id} href={`/clients/${c.id}`} className="block border-b border-line px-4 py-3 last:border-0 hover:bg-panel-2">
                {fullName(c)}
              </Link>
            ))}
          </div>
        )}
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="label">Retests due</p>
            <span className="font-mono text-xs text-dim">next 7 days + overdue</span>
          </div>
          {due.length === 0 ? (
            <p className="text-sm text-dim">Nobody is due. Nice.</p>
          ) : (
            <ul className="divide-y divide-line">
              {due.map(({ s, status }) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <Link href={`/clients/${s.client_id}`} className="font-medium hover:text-accent">
                    {byId[s.client_id] ? fullName(byId[s.client_id]) : "…"}
                  </Link>
                  <span className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 font-mono text-xs ${status === "overdue" ? "bg-bad/15 text-bad" : "bg-warn/15 text-warn"}`}>
                      {status === "overdue" ? "overdue" : "due"} {new Date(s.retest_due + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                    <Link href={`/scan/new?client=${s.client_id}`} className="btn btn-ghost !min-h-9 !px-3 text-sm">
                      Retest
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel p-5">
          <p className="label mb-3">Recent scans</p>
          {scans.length === 0 ? (
            <p className="text-sm text-dim">No scans yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {scans.slice(0, 8).map((s) => (
                <li key={s.id}>
                  <Link href={`/scans/${s.id}`} className="flex items-center justify-between py-3 hover:text-accent">
                    <span>
                      <span className="font-medium">{byId[s.client_id] ? fullName(byId[s.client_id]) : "…"}</span>
                      <span className="ml-2 text-sm text-dim">{new Date(s.performed_at).toLocaleDateString()}</span>
                    </span>
                    <span className="font-mono" style={{ color: scoreColor(Number(s.total_pct)) }}>
                      {Math.round(Number(s.total_pct))}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="panel flex flex-col justify-center p-4">
      <span className="label">{label}</span>
      <span className="font-mono text-3xl font-semibold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Home />
    </AppShell>
  );
}
