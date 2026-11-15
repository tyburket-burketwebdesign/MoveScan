"use client";

import Link from "next/link";
import { useMemo } from "react";
import AppShell, { Loading, PageHeader } from "@/components/AppShell";
import { Avatar, Check, Pill } from "@/components/ui";
import { Delta, HeatLegend, heat, scoreColor, ThermalBody } from "@/components/viz";
import { REGION_LABELS, type Region } from "@/lib/battery";
import { billingSummary, invoiceNo, money } from "@/lib/billing";
import { scoreScan, type ScoreResult } from "@/lib/scoring";
import { loadGym } from "@/lib/store";
import { indexLogs, isDone, missedInRow } from "@/lib/training";
import { addDays, daysBetween, fmtDate, fullName, mondayOf, retestStatus, todayISO, type Scan } from "@/lib/types";
import { useLoad } from "@/lib/useSettings";

function Today() {
  const [gym] = useLoad(loadGym);
  const today = todayISO();

  const view = useMemo(() => {
    if (!gym) return null;
    const { clients, scans, subs, invoices, sessions, logs } = gym;
    const byId = Object.fromEntries(clients.map((c) => [c.id, c]));
    const logMap = indexLogs(logs);

    const latest: Scan[] = [];
    const seen = new Set<string>();
    for (const s of scans) {
      if (!byId[s.client_id] || seen.has(s.client_id)) continue;
      seen.add(s.client_id);
      latest.push(s);
    }

    // Gym-wide heat: pool every athlete's latest scan.
    const regions = {} as ScoreResult["regions"];
    for (const s of latest)
      for (const [region, r] of Object.entries(scoreScan(s).regions) as [Region, ScoreResult["regions"][Region]][]) {
        const acc = (regions[region] ??= { R: { passed: 0, possible: 0, pct: null }, L: { passed: 0, possible: 0, pct: null } });
        for (const side of ["R", "L"] as const) {
          acc[side].passed += r[side].passed;
          acc[side].possible += r[side].possible;
          acc[side].pct = acc[side].possible ? (acc[side].passed / acc[side].possible) * 100 : null;
        }
      }
    const worst = (Object.entries(regions) as [Region, ScoreResult["regions"][Region]][])
      .map(([region, r]) => ({ region, rate: 1 - (r.R.passed + r.L.passed) / Math.max(1, r.R.possible + r.L.possible) }))
      .filter((x) => x.rate > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 4);

    const avg = latest.length ? latest.reduce((t, s) => t + Number(s.total_pct), 0) / latest.length : null;
    const gains = clients
      .map((c) => scans.filter((s) => s.client_id === c.id))
      .filter((h) => h.length > 1)
      .map((h) => Number(h[0].total_pct) - Number(h[h.length - 1].total_pct));
    const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / gains.length : null;

    // This week's sessions across the whole gym.
    const monday = mondayOf(today);
    const week = sessions.filter((s) => s.date >= monday && s.date <= addDays(monday, 6) && byId[s.assignment.client_id]);
    const weekDone = week.filter((s) => isDone(s, logMap)).length;
    const floor = week.filter((s) => s.date === today);

    // One list of everything that needs a decision from the trainer.
    type Item = { key: string; who: string; href: string; what: string; tone: "bad" | "warn"; action: string; sort: number };
    const attention: Item[] = [];
    for (const inv of invoices.filter((i) => i.status === "open" && i.due < today && byId[i.client_id]))
      attention.push({ key: inv.id, who: fullName(byId[inv.client_id]), href: `/billing/${inv.id}`, what: `${invoiceNo(inv.number)} for ${money(inv.total)} is ${daysBetween(inv.due, today)} days overdue`, tone: "bad", action: "Open invoice", sort: 0 });
    for (const c of clients) {
      const mine = sessions.filter((s) => s.assignment.client_id === c.id);
      const missed = missedInRow(mine, logMap, today);
      if (mine.length && missed >= 2) attention.push({ key: `m${c.id}`, who: fullName(c), href: `/clients/${c.id}?tab=training`, what: `Missed the last ${missed} sessions`, tone: "warn", action: "Check in", sort: 1 });
    }
    for (const s of latest) {
      const st = retestStatus(s.retest_due);
      if (st !== "ok") attention.push({ key: `r${s.id}`, who: fullName(byId[s.client_id]), href: `/scan/new?client=${s.client_id}`, what: st === "overdue" ? `Retest overdue since ${fmtDate(s.retest_due)}` : `Retest due ${fmtDate(s.retest_due)}`, tone: st === "overdue" ? "bad" : "warn", action: "Retest", sort: 2 });
    }
    attention.sort((a, b) => a.sort - b.sort);

    return { byId, logMap, regions, worst, avg, gains: avgGain, week, weekDone, floor, attention, bill: billingSummary(subs, invoices, today), latestCount: latest.length };
  }, [gym, today]);

  if (!gym || !view) return <Loading />;
  const { settings, clients } = gym;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const n = view.attention.length;

  return (
    <div>
      <PageHeader
        eyebrow={fmtDate(today, { weekday: "long", month: "long", day: "numeric" })}
        title={`${greet}${settings.ownerName ? `, ${settings.ownerName}` : ""}`}
        sub={n === 0 ? "Nothing needs you right now." : `${n} ${n === 1 ? "thing needs" : "things need"} your attention.`}
      />

      <section className="surface grid grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Monthly recurring revenue", value: money(Math.round(view.bill.mrr)), foot: <span>{view.bill.members} memberships</span>, href: "/billing" },
          {
            label: "Sessions this week",
            value: `${view.weekDone}`,
            unit: `/ ${view.week.length}`,
            foot: <span>{view.week.length ? Math.round((view.weekDone / view.week.length) * 100) : 0}% of the week checked off</span>,
            href: "/training",
          },
          {
            label: "Average movement score",
            value: view.avg === null ? "–" : `${Math.round(view.avg)}`,
            color: view.avg === null ? undefined : scoreColor(view.avg),
            foot: view.gains !== null ? <><Delta d={view.gains} /> <span>average gain on retest</span></> : <span>From {view.latestCount} scans</span>,
            href: "/clients",
          },
          { label: "Active athletes", value: `${clients.length}`, foot: <span>{money(view.bill.collected)} collected this month</span>, href: "/clients" },
        ].map((k, i) => (
          <Link key={k.label} href={k.href} className={`group px-6 py-7 transition-colors hover:bg-white/[0.02] sm:px-8 ${i % 2 ? "border-l border-hair" : ""} ${i > 1 ? "border-t border-hair lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}>
            <p className="text-sm text-dim">{k.label}</p>
            <p className="readout mt-4 text-5xl sm:text-6xl" style={{ color: k.color }}>
              {k.value}
              {k.unit && <span className="ml-2 text-2xl text-faint">{k.unit}</span>}
            </p>
            <p className="mt-4 flex items-center gap-1.5 text-[13px] text-dim">{k.foot}</p>
          </Link>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <div className="surface px-6 py-7 sm:px-8">
            <h2 className="mb-2 text-lg font-semibold">Needs attention</h2>
            {n === 0 ? (
              <p className="py-6 text-dim">All clear. Overdue invoices, missed sessions and retests show up here.</p>
            ) : (
              <ul>
                {view.attention.map((a) => (
                  <li key={a.key} className="flex items-center justify-between gap-4 border-t border-hair py-4 first:border-0">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${a.tone === "bad" ? "bg-hot" : "bg-amber"}`} />
                      <div className="min-w-0">
                        <p className="font-medium">{a.who}</p>
                        <p className="text-sm text-dim">{a.what}</p>
                      </div>
                    </div>
                    <Link href={a.href} className="btn btn-quiet !min-h-10 shrink-0">
                      {a.action}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="surface px-6 py-7 sm:px-8">
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-semibold">Training today</h2>
              <span className="text-sm text-dim">
                {view.floor.filter((s) => isDone(s, view.logMap)).length} of {view.floor.length} done
              </span>
            </div>
            {view.floor.length === 0 ? (
              <p className="py-6 text-dim">No sessions scheduled today.</p>
            ) : (
              <ul>
                {view.floor.map((s) => {
                  const c = view.byId[s.assignment.client_id];
                  const done = isDone(s, view.logMap);
                  return (
                    <li key={s.assignment.id + s.day.id} className="border-t border-hair first:border-0">
                      <Link href={`/clients/${c.id}?tab=training`} className="flex items-center gap-4 py-3.5 hover:text-ice">
                        <Avatar who={c} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{fullName(c)}</span>
                          <span className="block truncate text-sm text-dim">
                            {s.assignment.program.name}, {s.day.name.toLowerCase()}
                          </span>
                        </span>
                        {done ? (
                          <Pill tone="good">
                            <Check size={11} />
                            <span className="ml-1">Done</span>
                          </Pill>
                        ) : (
                          <Pill>Not yet</Pill>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="surface flex flex-col px-6 py-7 sm:px-8">
          <h2 className="text-lg font-semibold">Gym heat signature</h2>
          <p className="mt-1 text-sm text-dim">Where your athletes compensate most, from each athlete&apos;s latest scan</p>
          {view.latestCount === 0 ? (
            <p className="py-10 text-dim">Fills in as you scan.</p>
          ) : (
            <>
              <div className="mt-6 flex justify-center">
                <ThermalBody regions={view.regions} view="front" height={290} showSides={false} />
                <ThermalBody regions={view.regions} view="back" height={290} showSides={false} />
              </div>
              <HeatLegend className="mt-3 justify-center" />
              <ol className="mt-7 space-y-3 border-t border-hair pt-6">
                {view.worst.map((w) => (
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
