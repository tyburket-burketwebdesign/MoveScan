"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell, { Loading, PageHeader } from "@/components/AppShell";
import { Delta, HeatLegend, heat, scoreColor, ThermalBody } from "@/components/viz";
import { REGION_LABELS, type Region } from "@/lib/battery";
import { scoreScan, type ScoreResult } from "@/lib/scoring";
import { store } from "@/lib/store";
import { fullName, retestStatus, type Client, type Scan } from "@/lib/types";
import { useSettings } from "@/lib/useSettings";

function Today() {
  const { settings } = useSettings();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    store.listClients().then(setClients);
    store.listScans().then(setScans);
  }, []);

  const byId = useMemo(() => Object.fromEntries((clients ?? []).map((c) => [c.id, c])), [clients]);
  const latest = useMemo(() => {
    const seen = new Set<string>();
    return scans.filter((s) => (seen.has(s.client_id) ? false : (seen.add(s.client_id), true)));
  }, [scans]);

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
      .slice(0, 4);
    return { regions, worst };
  }, [latest]);

  if (clients === null || !settings) return <Loading />;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const thisMonth = scans.filter((s) => s.performed_at >= monthStart).length;
  const lastMonth = scans.filter((s) => s.performed_at >= lastMonthStart && s.performed_at < monthStart).length;
  const due = latest
    .map((s) => ({ s, status: retestStatus(s.retest_due) }))
    .filter((x) => x.status !== "ok")
    .sort((a, b) => a.s.retest_due.localeCompare(b.s.retest_due));
  const overdue = due.filter((d) => d.status === "overdue").length;
  const compliance = latest.length ? ((latest.length - overdue) / latest.length) * 100 : null;
  const avg = latest.length ? latest.reduce((t, s) => t + Number(s.total_pct), 0) / latest.length : null;
  // Average improvement for athletes with more than one scan.
  const gains = clients
    .map((c) => scans.filter((s) => s.client_id === c.id))
    .filter((h) => h.length > 1)
    .map((h) => Number(h[0].total_pct) - Number(h[h.length - 1].total_pct));
  const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / gains.length : null;

  const hour = now.getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const matches = q ? clients.filter((c) => fullName(c).toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];

  return (
    <div>
      <PageHeader
        eyebrow={now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        title={`${greet}${settings.ownerName ? `, ${settings.ownerName}` : ""}`}
        sub={due.length === 0 ? "Every athlete is current on their retest." : `${due.length} ${due.length === 1 ? "athlete needs" : "athletes need"} a retest this week.`}
      />

      <section className="surface grid grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Scans this month", value: `${thisMonth}`, foot: <><Delta d={thisMonth - lastMonth || null} /> <span>{lastMonth} last month</span></> },
          { label: "Average score", value: avg === null ? "–" : `${Math.round(avg)}`, color: avg === null ? undefined : scoreColor(avg), foot: avgGain !== null ? <><Delta d={avgGain} /> <span>average gain on retest</span></> : <span>Across {latest.length} athletes</span> },
          { label: "Retest compliance", value: compliance === null ? "–" : `${Math.round(compliance)}%`, foot: <span>{overdue} overdue</span> },
          { label: "Scan revenue, this month", value: `$${(thisMonth * settings.assessmentPrice).toLocaleString()}`, foot: <span>At ${settings.assessmentPrice} per scan</span> },
        ].map((k, i) => (
          <div key={k.label} className={`px-6 py-7 sm:px-8 ${i % 2 ? "border-l border-hair" : ""} ${i > 1 ? "border-t border-hair lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}>
            <p className="text-sm text-dim">{k.label}</p>
            <p className="readout mt-4 text-5xl sm:text-6xl" style={{ color: k.color }}>
              {k.value}
            </p>
            <p className="mt-4 flex items-center gap-1.5 text-[13px] text-dim">{k.foot}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <div className="surface px-6 py-7 sm:px-8">
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-semibold">Retests due</h2>
              <span className="text-sm text-dim">Overdue and next 7 days</span>
            </div>
            {due.length === 0 ? (
              <p className="py-6 text-dim">Nothing due. New retests appear here a week ahead.</p>
            ) : (
              <ul>
                {due.map(({ s, status }) => (
                  <li key={s.id} className="flex items-center justify-between gap-4 border-t border-hair py-4 first:border-0">
                    <div className="min-w-0">
                      <Link href={`/clients/${s.client_id}`} className="font-medium hover:text-ice">
                        {byId[s.client_id] ? fullName(byId[s.client_id]) : "…"}
                      </Link>
                      <p className={`text-sm ${status === "overdue" ? "text-hot" : "text-amber"}`}>
                        {status === "overdue" ? "Overdue since" : "Due"} {new Date(s.retest_due + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <Link href={`/scan/new?client=${s.client_id}`} className="btn btn-quiet !min-h-10">
                      Retest
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="surface px-6 py-7 sm:px-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Recent scans</h2>
              <div className="relative w-56">
                <input className="field !min-h-10 !rounded-[10px] !text-sm" placeholder="Find an athlete" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find an athlete" />
                {matches.length > 0 && (
                  <div className="absolute right-0 top-12 z-20 w-64 overflow-hidden rounded-[14px] border border-line bg-raised shadow-2xl">
                    {matches.map((c) => (
                      <Link key={c.id} href={`/clients/${c.id}`} className="block px-4 py-3 text-sm hover:bg-white/5">
                        {fullName(c)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {scans.length === 0 ? (
              <p className="py-6 text-dim">No scans yet. The first one takes about ten minutes.</p>
            ) : (
              <ul>
                {scans.slice(0, 6).map((s) => (
                  <li key={s.id} className="border-t border-hair first:border-0">
                    <Link href={`/scans/${s.id}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-5 py-3.5 hover:text-ice">
                      <span className="truncate font-medium">{byId[s.client_id] ? fullName(byId[s.client_id]) : "…"}</span>
                      <span className="text-sm text-dim">{new Date(s.performed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      <span className="num w-10 text-right" style={{ color: scoreColor(Number(s.total_pct)) }}>
                        {Math.round(Number(s.total_pct))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="surface flex flex-col px-6 py-7 sm:px-8">
          <h2 className="text-lg font-semibold">Gym heat signature</h2>
          <p className="mt-1 text-sm text-dim">Where your athletes compensate most, from each athlete&apos;s latest scan</p>
          {latest.length === 0 ? (
            <p className="py-10 text-dim">Fills in as you scan.</p>
          ) : (
            <>
              <div className="mt-6 flex justify-center">
                <ThermalBody regions={gym.regions} view="front" height={290} showSides={false} />
                <ThermalBody regions={gym.regions} view="back" height={290} showSides={false} />
              </div>
              <HeatLegend className="mt-3 justify-center" />
              <ol className="mt-7 space-y-3 border-t border-hair pt-6">
                {gym.worst.map((w) => (
                  <li key={w.region} className="grid grid-cols-[10px_1fr_auto] items-center gap-3">
                    <span className="h-2 w-2 rounded-full" style={{ background: heat(0.45 + 0.55 * w.rate) }} />
                    <span>{REGION_LABELS[w.region]}</span>
                    <span className="num text-sm text-dim">{Math.round(w.rate * 100)}% of checks fail</span>
                  </li>
                ))}
              </ol>
            </>
          )}
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
