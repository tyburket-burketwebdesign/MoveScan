"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { HeatLegend, scoreColor, ThermalBody } from "@/components/viz";
import { REGION_LABELS, type Region } from "@/lib/battery";
import { scoreScan, type ScoreResult } from "@/lib/scoring";
import { store } from "@/lib/store";
import { fullName, retestStatus, type Client, type Scan } from "@/lib/types";

function Today() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    store.listClients().then(setClients);
    store.listScans().then(setScans);
  }, []);

  const byId = useMemo(() => Object.fromEntries((clients ?? []).map((c) => [c.id, c])), [clients]);

  // A client's latest scan sets their retest date and counts toward the gym picture.
  const latest = useMemo(() => {
    const seen = new Set<string>();
    return scans.filter((s) => (seen.has(s.client_id) ? false : (seen.add(s.client_id), true)));
  }, [scans]);

  const due = latest
    .map((s) => ({ s, status: retestStatus(s.retest_due) }))
    .filter((x) => x.status !== "ok")
    .sort((a, b) => a.s.retest_due.localeCompare(b.s.retest_due));

  // Pool every client's latest scan into one gym-wide heat picture.
  const gym = useMemo(() => {
    const regions = {} as ScoreResult["regions"];
    for (const s of latest) {
      for (const [region, r] of Object.entries(scoreScan(s).regions) as [Region, ScoreResult["regions"][Region]][]) {
        const acc = (regions[region] ??= { R: { passed: 0, possible: 0, pct: null }, L: { passed: 0, possible: 0, pct: null } });
        for (const side of ["R", "L"] as const) {
          acc[side].passed += r[side].passed;
          acc[side].possible += r[side].possible;
          acc[side].pct = acc[side].possible ? (acc[side].passed / acc[side].possible) * 100 : null;
        }
      }
    }
    const worst = (Object.entries(regions) as [Region, ScoreResult["regions"][Region]][])
      .map(([region, r]) => ({ region, rate: 1 - (r.R.passed + r.L.passed) / Math.max(1, r.R.possible + r.L.possible) }))
      .filter((x) => x.rate > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3);
    return { regions, worst };
  }, [latest]);

  const avg = latest.length ? latest.reduce((t, s) => t + Number(s.total_pct), 0) / latest.length : null;
  const matches = q ? (clients ?? []).filter((c) => fullName(c).toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const dueThisWeek = due.length;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="display text-4xl sm:text-6xl">{today}</h1>
          <p className="mt-3 text-lg text-dim">
            {clients === null
              ? " "
              : dueThisWeek === 0
                ? "No retests due this week."
                : `${dueThisWeek} ${dueThisWeek === 1 ? "client is" : "clients are"} due for a retest.`}
          </p>
        </div>
        <Link href="/scan/new" className="btn btn-primary !min-h-14 !px-8 text-lg">
          Start a scan
        </Link>
      </header>

      <div className="relative">
        <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" strokeLinecap="round" />
        </svg>
        <input className="field !min-h-14 !rounded-full !pl-11 text-lg" placeholder="Find a client" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a client" />
        {matches.length > 0 && (
          <div className="absolute inset-x-0 top-16 z-20 overflow-hidden rounded-2xl border border-line bg-raised shadow-2xl">
            {matches.map((c) => (
              <Link key={c.id} href={`/clients/${c.id}`} className="block px-5 py-3.5 hover:bg-surface">
                {fullName(c)}
              </Link>
            ))}
          </div>
        )}
      </div>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <div className="surface p-6 sm:p-8">
            <h2 className="wide mb-1 text-xl font-bold">Retests due</h2>
            <p className="mb-5 text-sm text-dim">Overdue and due in the next 7 days</p>
            {due.length === 0 ? (
              <p className="rounded-2xl bg-bg/50 p-5 text-dim">Everyone is current. New retests show up here a week before they&apos;re due.</p>
            ) : (
              <ul className="divide-y divide-line">
                {due.map(({ s, status }) => (
                  <li key={s.id} className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <Link href={`/clients/${s.client_id}`} className="font-semibold hover:text-ice">
                        {byId[s.client_id] ? fullName(byId[s.client_id]) : "…"}
                      </Link>
                      <p className={`text-sm ${status === "overdue" ? "text-hot" : "text-amber"}`}>
                        {status === "overdue" ? "Overdue since" : "Due"} {new Date(s.retest_due + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <Link href={`/scan/new?client=${s.client_id}`} className="btn btn-quiet !min-h-11">
                      Retest
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="surface p-6 sm:p-8">
            <h2 className="wide mb-5 text-xl font-bold">Recent scans</h2>
            {scans.length === 0 ? (
              <div className="rounded-2xl bg-bg/50 p-5">
                <p className="text-dim">No scans yet. Your first one takes about ten minutes.</p>
                <Link href="/scan/new" className="mt-3 inline-block font-semibold text-ice">
                  Start a scan
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {scans.slice(0, 6).map((s) => (
                  <li key={s.id}>
                    <Link href={`/scans/${s.id}`} className="flex items-center justify-between gap-4 py-3.5 hover:text-ice">
                      <span>
                        <span className="font-semibold">{byId[s.client_id] ? fullName(byId[s.client_id]) : "…"}</span>
                        <span className="ml-3 text-sm text-dim">{new Date(s.performed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      </span>
                      <span className="num text-lg" style={{ color: scoreColor(Number(s.total_pct)) }}>
                        {Math.round(Number(s.total_pct))}%
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="surface flex flex-col p-6 sm:p-8">
          <h2 className="wide mb-1 text-xl font-bold">Your gym&apos;s heat signature</h2>
          <p className="mb-6 text-sm text-dim">Where your clients compensate most, from each client&apos;s latest scan</p>
          {latest.length === 0 ? (
            <p className="text-dim">Fills in once you have scans.</p>
          ) : (
            <>
              <div className="flex justify-center gap-2">
                <ThermalBody regions={gym.regions} view="front" height={300} />
                <ThermalBody regions={gym.regions} view="back" height={300} />
              </div>
              <div className="mt-4 flex justify-center">
                <HeatLegend />
              </div>
              {gym.worst.length > 0 && (
                <ol className="mb-6 mt-6 space-y-2 border-t border-line pt-5">
                  {gym.worst.map((w, i) => (
                    <li key={w.region} className="flex justify-between">
                      <span>
                        <span className="num mr-3 text-faint">{i + 1}</span>
                        {REGION_LABELS[w.region]}
                      </span>
                      <span className="num text-dim">{Math.round(w.rate * 100)}% fail</span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
          <dl className="mt-auto grid grid-cols-3 gap-4 border-t border-line pt-6 text-center">
            <div>
              <dt className="text-sm text-dim">Clients</dt>
              <dd className="num text-3xl">{clients?.length ?? 0}</dd>
            </div>
            <div>
              <dt className="text-sm text-dim">Scans</dt>
              <dd className="num text-3xl">{scans.length}</dd>
            </div>
            <div>
              <dt className="text-sm text-dim">Average</dt>
              <dd className="num text-3xl" style={{ color: avg === null ? undefined : scoreColor(avg) }}>
                {avg === null ? "–" : `${Math.round(avg)}%`}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Today />
    </AppShell>
  );
}
