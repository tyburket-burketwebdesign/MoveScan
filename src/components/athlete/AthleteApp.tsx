"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { InvoicePaper, planPrice, StatusPill } from "@/components/BillingBits";
import { WeekStrip } from "@/components/TrainingBits";
import { Check, Pill, Sheet } from "@/components/ui";
import { BodyMap, Delta, Dial, heat, HistoryChart, scoreColor, ThermalBody } from "@/components/viz";
import { REGION_LABELS, type Region } from "@/lib/battery";
import { invoiceNo, money, nextBillDate, type Invoice } from "@/lib/billing";
import { BRAND } from "@/lib/brand";
import { payInvoice, saveLog, type PortalBundle } from "@/lib/portal";
import { failedCompensations, scoreScan } from "@/lib/scoring";
import { allSessions, compliance, estMinutes, exerciseIndex, indexLogs, isDone, logId, mergeLibrary, streak, type Session, type WorkoutLog } from "@/lib/training";
import { addDays, fmtDate, initials, mondayOf, todayISO } from "@/lib/types";
import WorkoutPlayer from "./WorkoutPlayer";

type Tab = "today" | "training" | "scan" | "account";
const sideLabel = { R: "Right", L: "Left", W: "Whole body" } as const;

const TABS: { key: Tab; label: string; d: string }[] = [
  { key: "today", label: "Today", d: "M3 12h4l3-8 4 16 3-8h4" },
  { key: "training", label: "Training", d: "M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" },
  { key: "scan", label: "Scan", d: "M12 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM6 10h12M12 10v5M12 15l-3 6M12 15l3 6" },
  { key: "account", label: "Account", d: "M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5ZM3 10h18M7 15h3" },
];

export default function AthleteApp({ token, initial, startTab }: { token: string; initial: PortalBundle; startTab?: Tab }) {
  const [b, setB] = useState(initial);
  const [tab, setTab] = useState<Tab>(startTab ?? "today");
  const [open, setOpen] = useState<Session | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const today = todayISO();

  const sessions = useMemo(() => allSessions(b.assignments), [b.assignments]);
  const logs = useMemo(() => indexLogs(b.logs), [b.logs]);
  const library = useMemo(() => exerciseIndex(mergeLibrary(b.exercises)), [b.exercises]);

  const todays = sessions.filter((s) => s.date === today);
  const session = todays.find((s) => !isDone(s, logs)) ?? todays[0] ?? null;
  const nextUp = sessions.find((s) => s.date > today) ?? null;
  const monday = mondayOf(today);
  const week = sessions.filter((s) => s.date >= monday && s.date <= addDays(monday, 6));
  const month = compliance(sessions, logs, today, 28);
  const run = streak(sessions, logs, today);
  const program = b.assignments[0] ?? null;
  const programWeek = program ? Math.min(program.weeks, Math.max(1, Math.floor((Date.parse(today) - Date.parse(program.start)) / (7 * 864e5)) + 1)) : 0;

  const scan = b.scans[0] ?? null;
  const prevScan = b.scans[1] ?? null;
  const score = scan ? scoreScan(scan) : null;
  const scoreDelta = scan && prevScan ? Number(scan.total_pct) - Number(prevScan.total_pct) : null;
  const focus = useMemo(() => {
    if (!score || !scan) return [];
    const fails = failedCompensations(scan.fails);
    return (Object.entries(score.regions) as [Region, (typeof score.regions)[Region]][])
      .map(([region, r]) => {
        const possible = r.R.possible + r.L.possible;
        const right = r.R.passed < r.R.possible;
        const left = r.L.passed < r.L.possible;
        return { region, rate: possible ? (possible - r.R.passed - r.L.passed) / possible : 0, side: right && left ? "Both sides" : right ? "Right side" : "Left side", what: Array.from(new Set(fails.filter((f) => f.region === region).map((f) => f.compensation))) };
      })
      .filter((x) => x.rate > 0)
      .sort((a, b2) => b2.rate - a.rate)
      .slice(0, 3);
  }, [score, scan]);

  const openInvoices = b.invoices.filter((i) => i.status === "open").sort((a, c) => a.due.localeCompare(c.due));

  const onSave = async (log: WorkoutLog) => {
    setB((cur) => ({ ...cur, logs: [...cur.logs.filter((l) => l.id !== log.id), log] }));
    await saveLog(token, log);
  };

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const doneCount = (s: Session) => {
    const l = logs.get(logId(s));
    return s.day.items.filter((i) => (l?.done[i.id] ?? 0) >= i.sets).length;
  };

  const sessionRow = (s: Session) => {
    const done = isDone(s, logs);
    const missed = !done && s.date < today;
    return (
      <li key={logId(s)}>
        <button className="flex w-full items-center gap-4 py-3.5 text-left" onClick={() => setOpen(s)}>
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-bg ${done ? "bg-ice" : missed ? "shadow-[inset_0_0_0_1.5px_var(--color-hot)]" : "shadow-[inset_0_0_0_1.5px_var(--color-line)]"}`}>{done && <Check size={14} />}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{s.day.name}</span>
            <span className="block text-sm text-dim">
              {s.date === today ? "Today" : fmtDate(s.date, { weekday: "long", month: "short", day: "numeric" })}, {s.day.items.length} exercises
            </span>
          </span>
          {missed && <Pill tone="bad">Missed</Pill>}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-faint" aria-hidden>
            <path d="m9 5 7 7-7 7" />
          </svg>
        </button>
      </li>
    );
  };

  return (
    <div className="min-h-dvh bg-[#0b0c0e]" style={b.gym.accent ? ({ "--color-ice": b.gym.accent } as React.CSSProperties) : undefined}>
      <div className="relative mx-auto min-h-dvh max-w-[480px] bg-bg shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
        <header className="flex items-center justify-between px-5 pb-2" style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}>
          <span className="text-[15px] font-semibold tracking-tight">{b.gym.name}</span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.07] text-xs font-semibold text-dim">{initials(b.athlete)}</span>
        </header>

        <main className="px-5 pb-32 pt-4">
          {tab === "today" && (
            <div className="space-y-4">
              <div className="pb-3">
                <p className="text-dim">{fmtDate(today, { weekday: "long", month: "long", day: "numeric" })}</p>
                <h1 className="title mt-1 text-[2.4rem]">
                  {greet}, {b.athlete.first_name}
                </h1>
              </div>

              <section
                className="reveal overflow-hidden rounded-[22px] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
                style={{ background: "radial-gradient(130% 110% at 100% 0%, color-mix(in srgb, var(--color-ice) 20%, transparent), transparent 58%), var(--color-surface)" }}
              >
                {session ? (
                  isDone(session, logs) ? (
                    <>
                      <p className="flex items-center gap-2 text-sm text-ice">
                        <Check size={13} /> Done today
                      </p>
                      <h2 className="title mt-3 text-3xl">{session.day.name}</h2>
                      <p className="mt-2 text-dim">{nextUp ? `Next up: ${nextUp.day.name}, ${fmtDate(nextUp.date, { weekday: "long" })}.` : "That was the last session of this program."}</p>
                      <button className="btn btn-quiet mt-6 w-full" onClick={() => setOpen(session)}>
                        Review session
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-dim">
                        Today, week {session.week} of {session.assignment.weeks}
                      </p>
                      <h2 className="title mt-3 text-[2.6rem]">{session.day.name}</h2>
                      <p className="mt-2 text-dim">
                        {session.day.items.length} exercises, about {estMinutes(session.day)} minutes
                      </p>
                      <button className="btn btn-primary mt-7 w-full !min-h-14 text-base" onClick={() => setOpen(session)}>
                        {doneCount(session) > 0 ? `Continue, ${doneCount(session)} of ${session.day.items.length} done` : "Start session"}
                      </button>
                    </>
                  )
                ) : program ? (
                  <>
                    <p className="text-sm text-dim">Today</p>
                    <h2 className="title mt-3 text-3xl">Rest day</h2>
                    <p className="mt-2 text-dim">{nextUp ? `Next up: ${nextUp.day.name} on ${fmtDate(nextUp.date, { weekday: "long" })}.` : "You've finished this program. Your trainer will set up what's next."}</p>
                  </>
                ) : (
                  <>
                    <h2 className="title text-3xl">No program yet</h2>
                    <p className="mt-2 text-dim">Your trainer hasn&apos;t assigned your training yet. It shows up here the moment they do.</p>
                  </>
                )}
              </section>

              {program && (
                <section className="rounded-[22px] bg-surface p-6">
                  <div className="mb-4 flex items-baseline justify-between">
                    <h2 className="font-semibold">This week</h2>
                    <span className="text-sm text-dim">
                      {week.filter((s) => isDone(s, logs)).length} of {week.length} sessions
                    </span>
                  </div>
                  <WeekStrip sessions={sessions} logs={logs} />
                </section>
              )}

              <section className="grid grid-cols-3 gap-3">
                {[
                  { v: run, l: "in a row" },
                  { v: month.scheduled ? `${month.completed}/${month.scheduled}` : "–", l: "last 4 weeks" },
                  { v: scan ? Math.round(Number(scan.total_pct)) : "–", l: "movement", color: scan ? scoreColor(Number(scan.total_pct)) : undefined },
                ].map((s) => (
                  <div key={s.l} className="rounded-[18px] bg-surface px-3 py-5 text-center">
                    <p className="readout text-4xl" style={{ color: s.color }}>
                      {s.v}
                    </p>
                    <p className="mt-2 text-xs text-dim">{s.l}</p>
                  </div>
                ))}
              </section>

              {score && scan && (
                <button className="flex w-full items-center gap-5 rounded-[22px] bg-surface p-5 text-left" onClick={() => setTab("scan")}>
                  <ThermalBody regions={score.regions} view="front" height={132} showSides={false} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-dim">Movement scan, {fmtDate(scan.performed_at)}</span>
                    <span className="mt-1 flex items-baseline gap-3">
                      <span className="readout text-5xl" style={{ color: scoreColor(Number(scan.total_pct)) }}>
                        {Math.round(Number(scan.total_pct))}
                      </span>
                      <Delta d={scoreDelta} className="text-sm" />
                    </span>
                    {focus[0] && <span className="mt-2 block text-sm text-dim">Focus: {focus.map((f) => REGION_LABELS[f.region].toLowerCase()).join(", ")}</span>}
                  </span>
                </button>
              )}

              {openInvoices[0] && (
                <section className="flex items-center justify-between gap-4 rounded-[22px] bg-surface p-5">
                  <div>
                    <p className="font-medium">{money(openInvoices[0].total)} due</p>
                    <p className={`text-sm ${openInvoices[0].due < today ? "text-hot" : "text-dim"}`}>
                      {openInvoices[0].due < today ? "Was due" : "Due"} {fmtDate(openInvoices[0].due, { month: "long", day: "numeric" })}
                    </p>
                  </div>
                  <button className="btn btn-quiet" onClick={() => setTab("account")}>
                    View
                  </button>
                </section>
              )}
            </div>
          )}

          {tab === "training" && (
            <div className="space-y-4">
              <h1 className="title pb-2 text-[2.4rem]">Training</h1>
              {!program ? (
                <p className="rounded-[22px] bg-surface p-6 text-dim">Your trainer hasn&apos;t assigned a program yet.</p>
              ) : (
                <>
                  <section className="rounded-[22px] bg-surface p-6">
                    <p className="text-sm text-dim">
                      Week {programWeek} of {program.weeks}
                    </p>
                    <h2 className="title mt-2 text-3xl">{program.program.name}</h2>
                    {program.program.summary && <p className="mt-2 text-[15px] text-dim">{program.program.summary}</p>}
                    <div className="mt-5 h-[3px] overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-ice" style={{ width: `${(programWeek / program.weeks) * 100}%` }} />
                    </div>
                  </section>
                  {[
                    { title: "This week", list: week },
                    { title: "Next week", list: sessions.filter((s) => s.date > addDays(monday, 6) && s.date <= addDays(monday, 13)) },
                  ]
                    .filter((g) => g.list.length)
                    .map((g) => (
                      <section key={g.title} className="rounded-[22px] bg-surface px-6 py-4">
                        <h2 className="pb-1 pt-2 font-semibold">{g.title}</h2>
                        <ul className="divide-y divide-[var(--color-hair)]">
                          {g.list.map(sessionRow)}
                        </ul>
                      </section>
                    ))}
                  {sessions.some((s) => s.date < monday) && (
                    <details className="rounded-[22px] bg-surface px-6 py-4">
                      <summary className="cursor-pointer py-2 font-semibold">
                        Earlier sessions
                        <span className="ml-2 font-normal text-dim">
                          {sessions.filter((s) => s.date < monday && isDone(s, logs)).length} of {sessions.filter((s) => s.date < monday).length} done
                        </span>
                      </summary>
                      <ul className="divide-y divide-[var(--color-hair)]">
                        {sessions
                          .filter((s) => s.date < monday)
                          .reverse()
                          .map(sessionRow)}
                      </ul>
                    </details>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "scan" && (
            <div className="space-y-4">
              <h1 className="title pb-2 text-[2.4rem]">Movement scan</h1>
              {!scan || !score ? (
                <p className="rounded-[22px] bg-surface p-6 text-dim">No scan yet. After your first one, your heat map and score live here.</p>
              ) : (
                <>
                  <section className="reveal rounded-[22px] bg-surface p-6">
                    <p className="text-sm text-dim">Movement efficiency, {fmtDate(scan.performed_at, { month: "long", day: "numeric" })}</p>
                    <div className="mt-2 flex items-end gap-3">
                      <span className="readout text-[6.5rem]" style={{ color: scoreColor(score.total.pct) }}>
                        {Math.round(score.total.pct ?? 0)}
                      </span>
                      <span className="mb-3 text-xl font-light text-dim">/ 100</span>
                    </div>
                    {scoreDelta !== null && Math.abs(scoreDelta) >= 0.5 && (
                      <p className="mt-2 text-[15px] text-dim">
                        <Delta d={scoreDelta} className="mr-1.5" />
                        points since {fmtDate(prevScan!.performed_at, { month: "long", day: "numeric" })}
                      </p>
                    )}
                    <div className="mt-6 grid grid-cols-3 border-t border-hair pt-5">
                      <Dial pct={score.right.pct} label="Right" size={88} />
                      <Dial pct={score.left.pct} label="Left" size={88} />
                      <Dial pct={score.synergistic.pct} label="Whole body" size={88} />
                    </div>
                  </section>

                  <section className="rounded-[22px] bg-surface px-3 py-6">
                    <BodyMap
                      regions={score.regions}
                      height={330}
                      animate
                      failsByRegion={failedCompensations(scan.fails).reduce(
                        (acc, f) => (((acc[f.region] ??= []).push({ label: `${f.compensation} (${f.movement})`, side: sideLabel[f.side] })), acc),
                        {} as Partial<Record<Region, { label: string; side: string }[]>>,
                      )}
                    />
                  </section>

                  {focus.length > 0 && (
                    <section className="rounded-[22px] bg-surface p-6">
                      <h2 className="mb-4 font-semibold">Where to focus</h2>
                      <ol className="space-y-4">
                        {focus.map((f) => (
                          <li key={f.region} className="grid grid-cols-[10px_1fr] gap-x-4">
                            <span className="mt-[7px] h-2.5 w-2.5 rounded-full" style={{ background: heat(0.45 + 0.55 * f.rate) }} />
                            <div>
                              <p className="flex items-baseline justify-between gap-3">
                                <span className="font-medium">{REGION_LABELS[f.region]}</span>
                                <span className="text-sm text-dim">{f.side}</span>
                              </p>
                              <p className="mt-0.5 text-sm text-dim">{f.what.join(", ")}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </section>
                  )}

                  {b.scans.length > 1 && (
                    <section className="rounded-[22px] bg-surface p-6">
                      <h2 className="mb-3 font-semibold">Your progress</h2>
                      <HistoryChart compact points={[...b.scans].reverse().map((s) => ({ date: s.performed_at, pct: Number(s.total_pct) }))} />
                    </section>
                  )}

                  <div className="flex items-center justify-between gap-4 px-1 pt-2 text-sm">
                    <span className="text-dim">Next scan {fmtDate(scan.retest_due, { month: "long", day: "numeric" })}</span>
                    <Link href={`/r/${scan.id}`} className="font-medium text-ice">
                      Full report
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "account" && (
            <div className="space-y-4">
              <h1 className="title pb-2 text-[2.4rem]">Account</h1>
              <section className="rounded-[22px] bg-surface p-6">
                <p className="text-sm text-dim">Membership</p>
                {b.subscription ? (
                  <>
                    <h2 className="title mt-2 text-3xl">{b.subscription.name}</h2>
                    <p className="mt-1 text-dim">{planPrice(b.subscription)}</p>
                    <p className="mt-4 border-t border-hair pt-4 text-[15px] text-dim">
                      {b.subscription.status === "active" ? `Next invoice ${fmtDate(nextBillDate(b.subscription, today) ?? today, { month: "long", day: "numeric" })}` : "Paused. No invoices are being created."}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-[15px] text-dim">You&apos;re not on a membership. Ask {b.gym.name} about plans.</p>
                )}
              </section>

              {openInvoices.map((inv) => (
                <section key={inv.id} className="rounded-[22px] bg-surface p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-dim">{invoiceNo(inv.number)}</p>
                      <p className="readout mt-2 text-5xl">{money(inv.total)}</p>
                      <p className={`mt-2 text-sm ${inv.due < today ? "text-hot" : "text-dim"}`}>
                        {inv.due < today ? "Was due" : "Due"} {fmtDate(inv.due, { month: "long", day: "numeric" })}
                      </p>
                    </div>
                    <StatusPill inv={inv} />
                  </div>
                  <p className="mt-4 text-[15px] text-dim">{inv.lines.map((l) => l.label).join(", ")}</p>
                  <div className="mt-5 flex gap-2.5">
                    {b.gym.payoutsConnected ? (
                      <button className="btn btn-primary flex-1 !min-h-12" onClick={() => (setPayError(null), setPaying(inv))}>
                        Pay {money(inv.total)}
                      </button>
                    ) : (
                      <p className="flex-1 self-center text-sm text-dim">Pay {b.gym.name} directly. Online payments aren&apos;t set up yet.</p>
                    )}
                    <button className="btn btn-quiet !min-h-12" onClick={() => setViewing(inv)}>
                      View
                    </button>
                  </div>
                </section>
              ))}

              <section className="rounded-[22px] bg-surface px-6 py-4">
                <h2 className="pb-1 pt-2 font-semibold">Payment history</h2>
                {b.invoices.filter((i) => i.status === "paid").length === 0 ? (
                  <p className="py-3 text-dim">Nothing paid yet.</p>
                ) : (
                  <ul className="divide-y divide-[var(--color-hair)]">
                    {b.invoices
                      .filter((i) => i.status === "paid")
                      .sort((a, c) => c.number - a.number)
                      .map((inv) => (
                        <li key={inv.id}>
                          <button className="flex w-full items-center justify-between gap-4 py-3.5 text-left" onClick={() => setViewing(inv)}>
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{inv.lines[0]?.label}</span>
                              <span className="block text-sm text-dim">Paid {fmtDate(inv.paid_at!, { month: "long", day: "numeric" })}</span>
                            </span>
                            <span className="num">{money(inv.total)}</span>
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </section>

              <p className="pt-4 text-center text-xs text-faint">
                {b.gym.name} runs on {BRAND.name}
              </p>
            </div>
          )}
        </main>

        <nav className="fixed bottom-0 left-1/2 z-30 grid w-full max-w-[480px] -translate-x-1/2 grid-cols-4 border-t border-hair bg-bg/90 backdrop-blur-xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => (setTab(t.key), window.scrollTo({ top: 0 }))} aria-current={tab === t.key} className={`relative flex flex-col items-center gap-1 py-3 text-[11px] ${tab === t.key ? "text-ink" : "text-faint"}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={t.d} />
              </svg>
              {t.label}
              {t.key === "account" && openInvoices.length > 0 && <span className="absolute right-[calc(50%-18px)] top-2.5 h-2 w-2 rounded-full bg-hot" />}
            </button>
          ))}
        </nav>

        {open && (
          <WorkoutPlayer
            key={logId(open)}
            session={open}
            existing={logs.get(logId(open))}
            library={library}
            streakAfter={isDone(open, logs) ? run : run + 1}
            nextUp={sessions.find((s) => s.date > open.date) ?? null}
            onSave={onSave}
            onClose={() => setOpen(null)}
          />
        )}

        <Sheet open={!!paying} onClose={() => setPaying(null)} title={paying ? `Pay ${money(paying.total)}` : ""}>
          {paying && (
            <div className="space-y-5">
              <dl className="space-y-2 text-[15px]">
                {paying.lines.map((l, i) => (
                  <div key={i} className="flex justify-between gap-4">
                    <dt className="text-dim">{l.label}</dt>
                    <dd className="num">{money(l.amount)}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t border-hair pt-3 font-semibold">
                  <dt>To {b.gym.name}</dt>
                  <dd className="num">{money(paying.total)}</dd>
                </div>
              </dl>
              <p className="rounded-[12px] bg-amber/10 px-4 py-3 text-sm text-amber">Preview: card payments aren&apos;t live yet. Confirming marks this invoice as paid and charges nothing.</p>
              {payError && <p className="text-sm text-hot">{payError}</p>}
              <button
                className="btn btn-primary w-full !min-h-14 text-base"
                onClick={async () => {
                  try {
                    const paid = await payInvoice(token, paying);
                    setB((cur) => ({ ...cur, invoices: cur.invoices.map((i) => (i.id === paid.id ? paid : i)) }));
                    setPaying(null);
                    setViewing(paid);
                  } catch (e) {
                    setPayError(e instanceof Error ? e.message : "That didn't go through. Try again.");
                  }
                }}
              >
                Confirm payment
              </button>
            </div>
          )}
        </Sheet>

        {viewing && (
          <div className="fade print-solo fixed inset-0 z-40 overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-sm">
            <div className="no-print mx-auto mb-4 flex max-w-[720px] justify-between">
              <button className="btn btn-quiet" onClick={() => setViewing(null)}>
                Close
              </button>
              <button className="btn btn-quiet" onClick={() => window.print()}>
                Save as PDF
              </button>
            </div>
            <InvoicePaper invoice={viewing} gymName={b.gym.name} billTo={`${b.athlete.first_name} ${b.athlete.last_name}`.trim()} athlete={`${b.athlete.first_name} ${b.athlete.last_name}`.trim()} />
          </div>
        )}
      </div>
    </div>
  );
}
