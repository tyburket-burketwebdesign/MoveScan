"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AppShell, { Loading, PageHeader } from "@/components/AppShell";
import { InvoiceList, NewInvoiceSheet, planPrice } from "@/components/BillingBits";
import { AssignSheet, WeekStrip } from "@/components/TrainingBits";
import { Check, Field, Pill, Ring, Segmented, Sheet } from "@/components/ui";
import { Delta, HistoryChart, scoreColor, ThermalBody } from "@/components/viz";
import { money, nextBillDate, type Subscription } from "@/lib/billing";
import { scoreScan } from "@/lib/scoring";
import { store, syncBilling } from "@/lib/store";
import { compliance, indexLogs, isDone, logId, newId, programFromScan, sessionsFor, streak, type Program } from "@/lib/training";
import { ageFromDob, contactFor, fmtDate, fullName, isMinor, retestStatus, todayISO } from "@/lib/types";
import { useLoad } from "@/lib/useSettings";

type Tab = "overview" | "training" | "billing";

async function loadAthlete(id: string) {
  const client = await store.getClient(id);
  if (!client) return null;
  const [scans, assignments, logs, subs, plans, programs, settings] = await Promise.all([
    store.listScans(id),
    store.list("assignment", id),
    store.list("log", id),
    store.list("subscription", id),
    store.list("plan"),
    store.list("program"),
    store.getSettings(),
  ]);
  const invoices = (await syncBilling()).filter((i) => i.client_id === id).sort((a, b) => b.number - a.number);
  return { client, scans, assignments, logs, subs, plans, programs, settings, invoices, allInvoices: await store.list("invoice") };
}

function Profile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "overview");
  const [data, reload] = useLoad(() => loadAthlete(id), [id]);
  const [picking, setPicking] = useState(false);
  const [assigning, setAssigning] = useState<Program | null>(null);
  const [invoicing, setInvoicing] = useState(false);
  const [copied, setCopied] = useState(false);
  const today = todayISO();

  if (data === undefined) return <Loading />;
  if (data === null)
    return (
      <div className="surface p-10">
        <p className="text-xl font-semibold">This athlete isn&apos;t here</p>
        <p className="mt-2 text-dim">They may have been removed, or the link is wrong.</p>
        <Link href="/clients" className="btn btn-quiet mt-6">
          Back to athletes
        </Link>
      </div>
    );

  const { client, scans, assignments, logs, subs, plans, programs, settings, invoices } = data;
  const age = ageFromDob(client.dob);
  const contact = contactFor(client);
  const latest = scans[0];
  const st = latest ? retestStatus(latest.retest_due) : null;
  const h = client.height_in ? `${Math.floor(client.height_in / 12)}′${Math.round(client.height_in % 12)}″` : null;
  const facts = [age !== null && ["Age", `${age}`], h && ["Height", h], client.weight_lb && ["Weight", `${client.weight_lb} lb`], client.sport && ["Sport", client.sport]].filter(Boolean) as [string, string][];

  const active = assignments.find((a) => a.status === "active");
  const sessions = active ? sessionsFor(active) : [];
  const logMap = indexLogs(logs);
  const adherence = compliance(sessions, logMap, today);
  const week = active ? Math.min(active.weeks, Math.max(1, Math.floor((new Date(today).getTime() - new Date(active.start).getTime()) / (7 * 864e5)) + 1)) : 0;
  const recent = sessions.filter((s) => s.date <= today).slice(-8).reverse();
  const upcoming = sessions.filter((s) => s.date > today).slice(0, 3);

  const sub = subs.find((s) => s.status !== "canceled") ?? null;
  const portal = typeof location !== "undefined" ? `${location.origin}/a/${client.portal_token}` : "";
  const paidTotal = invoices.filter((i) => i.status === "paid").reduce((t, i) => t + i.total, 0);

  async function startMembership(planId: string) {
    const plan = plans.find((p) => p.id === planId);
    if (!plan || plan.interval === "once") return;
    for (const old of subs.filter((s) => s.status !== "canceled")) await store.put("subscription", { ...old, status: "canceled" });
    const s: Subscription = { id: newId(), client_id: client.id, plan_id: plan.id, name: plan.name, price: plan.price, interval: plan.interval, start: today, status: "active", resume_from: null };
    await store.put("subscription", s);
    reload();
  }

  return (
    <div>
      <PageHeader
        eyebrow={
          <Link href="/clients" className="hover:text-ink">
            Athletes
          </Link>
        }
        title={fullName(client)}
        sub={[age !== null && `${age}`, client.sport, sub && sub.status === "active" && sub.name].filter(Boolean).join(", ") || undefined}
      >
        <a className="btn btn-quiet" href={`/a/${client.portal_token}`} target="_blank" rel="noreferrer">
          Athlete app
        </a>
        <Link href={`/scan/new?client=${client.id}`} className="btn btn-primary">
          {scans.length ? "Retest" : "Run first scan"}
        </Link>
      </PageHeader>

      <div className="mb-6">
        <Segmented
          value={tab}
          onChange={setTab}
          label="Athlete sections"
          options={[
            ["overview", "Overview"],
            ["training", "Training"],
            ["billing", "Billing"],
          ]}
        />
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="surface p-6 sm:p-8">
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Movement score</h2>
                  {latest && (
                    <p className={`mt-1 text-sm ${st === "overdue" ? "text-hot" : st === "due_soon" ? "text-amber" : "text-dim"}`}>
                      {st === "overdue" ? "Retest overdue since" : "Next retest"} {fmtDate(latest.retest_due, { month: "long", day: "numeric" })}
                    </p>
                  )}
                </div>
                {latest && (
                  <span className="readout text-6xl" style={{ color: scoreColor(Number(latest.total_pct)) }}>
                    {Math.round(Number(latest.total_pct))}
                  </span>
                )}
              </div>
              {scans.length === 0 ? (
                <div className="flex h-44 flex-col items-center justify-center gap-3 text-center">
                  <p className="text-dim">No scan yet. The first one sets the baseline.</p>
                  <Link href={`/scan/new?client=${client.id}`} className="btn btn-quiet">
                    Run first scan
                  </Link>
                </div>
              ) : (
                <HistoryChart points={[...scans].reverse().map((s) => ({ date: s.performed_at, pct: Number(s.total_pct) }))} />
              )}
            </div>

            <div className="surface flex flex-col items-center p-6 sm:p-8">
              <h2 className="mb-4 self-start text-lg font-semibold">Latest heat map</h2>
              {latest ? (
                <Link href={`/scans/${latest.id}`} className="flex gap-1" aria-label="Open latest scan">
                  <ThermalBody regions={scoreScan(latest).regions} view="front" height={230} showSides={false} />
                  <ThermalBody regions={scoreScan(latest).regions} view="back" height={230} showSides={false} />
                </Link>
              ) : (
                <p className="self-start text-dim">Appears after the first scan.</p>
              )}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="surface p-6 sm:p-8">
              <h2 className="mb-2 text-lg font-semibold">Scan history</h2>
              {scans.length === 0 ? (
                <p className="py-4 text-dim">Nothing yet.</p>
              ) : (
                <ul>
                  {scans.map((s, i) => (
                    <li key={s.id} className="border-t border-hair first:border-0">
                      <Link href={`/scans/${s.id}`} className="flex items-center justify-between gap-4 py-4 hover:text-ice">
                        <span className="font-medium">{fmtDate(s.performed_at, { month: "long", day: "numeric", year: "numeric" })}</span>
                        <span className="flex items-baseline gap-4">
                          {scans[i + 1] && <Delta d={Number(s.total_pct) - Number(scans[i + 1].total_pct)} className="text-sm" />}
                          <span className="num w-10 text-right text-lg" style={{ color: scoreColor(Number(s.total_pct)) }}>
                            {Math.round(Number(s.total_pct))}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="surface space-y-6 p-6 sm:p-8">
              {facts.length > 0 && (
                <dl className="grid grid-cols-2 gap-4">
                  {facts.map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-sm text-dim">{k}</dt>
                      <dd className="font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <div className={`space-y-2 ${facts.length ? "border-t border-hair pt-5" : ""}`}>
                <h3 className="font-semibold">{isMinor(client) ? "Parent or guardian" : "Contact"}</h3>
                <p>{contact.name}</p>
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className="block break-all text-dim hover:text-ice">
                    {contact.email}
                  </a>
                ) : (
                  <p className="text-sm text-amber">No email on file, so reports and invoices can&apos;t be sent.</p>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="block text-dim hover:text-ice">
                    {contact.phone}
                  </a>
                )}
              </div>
              <div className="border-t border-hair pt-5">
                <h3 className="font-semibold">Athlete app</h3>
                <p className="mt-1 text-sm text-dim">Their private link to workouts, scans and invoices.</p>
                <button
                  className="btn btn-quiet mt-3 !min-h-10 text-sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(portal);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? "Link copied" : "Copy invite link"}
                </button>
              </div>
              {(client.injuries || client.goals) && (
                <div className="space-y-4 border-t border-hair pt-5 text-sm">
                  {client.injuries && (
                    <div>
                      <h3 className="mb-1 font-semibold">Injuries</h3>
                      <p className="text-dim">{client.injuries}</p>
                    </div>
                  )}
                  {client.goals && (
                    <div>
                      <h3 className="mb-1 font-semibold">Goals</h3>
                      <p className="text-dim">{client.goals}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === "training" && (
        <div className="space-y-6">
          {!active ? (
            <div className="surface flex flex-col items-start gap-4 p-8 sm:p-10">
              <h2 className="title text-2xl">No program yet</h2>
              <p className="max-w-lg text-dim">Assign one of your programs, or turn {client.first_name}&apos;s latest scan into a corrective program you can edit.</p>
              <div className="flex flex-wrap gap-2.5">
                <button className="btn btn-primary" onClick={() => setPicking(true)}>
                  Assign a program
                </button>
                {latest && (
                  <button
                    className="btn btn-quiet"
                    onClick={async () => {
                      const p = programFromScan(latest.fails, settings.mapping ?? undefined, client.first_name);
                      await store.put("program", p);
                      router.push(`/training/${p.id}?assign=${client.id}`);
                    }}
                  >
                    Build from latest scan
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <section className="surface grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <p className="text-sm text-dim">
                    Week {week} of {active.weeks}, started {fmtDate(active.start)}
                  </p>
                  <h2 className="title mt-2 text-3xl">{active.program.name}</h2>
                  <div className="mt-6 max-w-sm">
                    <WeekStrip sessions={sessions} logs={logMap} />
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2.5">
                    <Link href={`/training/${active.program_id}`} className="btn btn-quiet !min-h-10 text-sm">
                      Open program
                    </Link>
                    <button className="btn btn-quiet !min-h-10 text-sm" onClick={() => setPicking(true)}>
                      Change program
                    </button>
                    <button
                      className="btn btn-text !min-h-10 text-sm"
                      onClick={async () => {
                        if (!confirm(`End ${active.program.name} for ${client.first_name}? Their history is kept.`)) return;
                        await store.put("assignment", { ...active, status: "ended" });
                        reload();
                      }}
                    >
                      End program
                    </button>
                  </div>
                </div>
                <dl className="flex gap-8 lg:gap-10">
                  <div className="flex flex-col items-center gap-2">
                    <Ring pct={adherence.pct ?? 0} size={92} stroke={5} color={scoreColor(adherence.pct)}>
                      <span className="readout text-3xl">{adherence.pct === null ? "–" : Math.round(adherence.pct)}</span>
                    </Ring>
                    <dt className="text-sm text-dim">Adherence, 4 weeks</dt>
                  </div>
                  <div className="flex flex-col items-center justify-between gap-2">
                    <dd className="readout grid h-[92px] place-items-center text-6xl">{streak(sessions, logMap, today)}</dd>
                    <dt className="text-sm text-dim">Session streak</dt>
                  </div>
                </dl>
              </section>

              <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="surface p-6 sm:p-8">
                  <h2 className="mb-2 text-lg font-semibold">Recent sessions</h2>
                  {recent.length === 0 ? (
                    <p className="py-4 text-dim">The first session is {upcoming[0] ? fmtDate(upcoming[0].date, { weekday: "long", month: "long", day: "numeric" }) : "not scheduled"}.</p>
                  ) : (
                    <ul>
                      {recent.map((s) => {
                        const log = logMap.get(logId(s));
                        const done = isDone(s, logMap);
                        return (
                          <li key={logId(s)} className="flex items-center gap-4 border-t border-hair py-3.5 first:border-0">
                            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-bg ${done ? "bg-ice" : s.date === today ? "shadow-[inset_0_0_0_1.5px_var(--color-dim)]" : "shadow-[inset_0_0_0_1.5px_var(--color-hot)]"}`}>{done && <Check size={12} />}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">{s.day.name}</span>
                              <span className="block truncate text-sm text-dim">
                                {fmtDate(s.date, { weekday: "short", month: "short", day: "numeric" })}
                                {log?.note ? `, “${log.note}”` : ""}
                              </span>
                            </span>
                            {done ? log?.rpe ? <span className="text-sm text-dim">Effort {log.rpe}/10</span> : null : s.date === today ? <Pill>Today</Pill> : <Pill tone="bad">Missed</Pill>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="surface p-6 sm:p-8">
                  <h2 className="mb-2 text-lg font-semibold">Coming up</h2>
                  {upcoming.length === 0 ? (
                    <p className="py-4 text-dim">Nothing left in this program.</p>
                  ) : (
                    <ul>
                      {upcoming.map((s) => (
                        <li key={logId(s)} className="border-t border-hair py-3.5 first:border-0">
                          <p className="font-medium">{s.day.name}</p>
                          <p className="text-sm text-dim">
                            {fmtDate(s.date, { weekday: "long", month: "short", day: "numeric" })}, {s.day.items.length} exercises
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {tab === "billing" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <section className="surface flex flex-col gap-5 p-6 sm:p-8">
            <h2 className="text-lg font-semibold">Membership</h2>
            {sub ? (
              <>
                <div>
                  <p className="title text-2xl">{sub.name}</p>
                  <p className="mt-1 text-dim">{planPrice(sub)}</p>
                </div>
                <dl className="space-y-2 border-t border-hair pt-5 text-[15px]">
                  <div className="flex justify-between">
                    <dt className="text-dim">Status</dt>
                    <dd>{sub.status === "active" ? <Pill tone="good">Active</Pill> : <Pill tone="warn">Paused</Pill>}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-dim">Next invoice</dt>
                    <dd>{sub.status === "active" ? fmtDate(nextBillDate(sub, today)!, { month: "long", day: "numeric" }) : "Not scheduled"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-dim">Paid to date</dt>
                    <dd className="num">{money(paidTotal)}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    className="btn btn-quiet !min-h-10 text-sm"
                    onClick={async () => {
                      await store.put("subscription", sub.status === "active" ? { ...sub, status: "paused" } : { ...sub, status: "active", resume_from: today });
                      reload();
                    }}
                  >
                    {sub.status === "active" ? "Pause" : "Resume"}
                  </button>
                  <button
                    className="btn btn-text !min-h-10 text-sm"
                    onClick={async () => {
                      if (!confirm(`Cancel ${client.first_name}'s membership? No more invoices will be created.`)) return;
                      await store.put("subscription", { ...sub, status: "canceled" });
                      reload();
                    }}
                  >
                    Cancel membership
                  </button>
                </div>
                <Field label="Switch plan">
                  <select className="field" value="" onChange={(e) => e.target.value && startMembership(e.target.value)}>
                    <option value="">Choose a different plan</option>
                    {plans.filter((p) => p.active && p.interval !== "once" && p.id !== sub.plan_id).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}, {planPrice(p)}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : (
              <>
                <p className="text-dim">{client.first_name} isn&apos;t on a membership. Pick a plan and the first invoice is created today.</p>
                <div className="space-y-2">
                  {plans.filter((p) => p.active && p.interval !== "once").map((p) => (
                    <button key={p.id} onClick={() => startMembership(p.id)} className="flex w-full items-center justify-between gap-4 rounded-[12px] bg-white/[0.04] px-4 py-3.5 text-left transition-colors hover:bg-white/[0.08]">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-dim">{planPrice(p)}</span>
                    </button>
                  ))}
                  {plans.filter((p) => p.active && p.interval !== "once").length === 0 && (
                    <Link href="/billing?tab=plans" className="btn btn-quiet">
                      Create a membership plan
                    </Link>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="surface p-6 sm:p-8">
            <div className="mb-2 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Invoices</h2>
              <button className="btn btn-quiet !min-h-10 text-sm" onClick={() => setInvoicing(true)}>
                New invoice
              </button>
            </div>
            <InvoiceList invoices={invoices} onChange={reload} empty="No invoices yet." />
          </section>
        </div>
      )}

      <Sheet open={picking} onClose={() => setPicking(false)} title="Choose a program">
        {programs.length === 0 ? (
          <div className="space-y-4">
            <p className="text-dim">You haven&apos;t built a program yet.</p>
            <Link href="/training" className="btn btn-primary">
              Go to Training
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {programs.map((p) => (
              <li key={p.id}>
                <button className="w-full rounded-[12px] bg-white/[0.04] px-4 py-3.5 text-left transition-colors hover:bg-white/[0.08]" onClick={() => (setPicking(false), setAssigning(p))}>
                  <span className="block font-medium">{p.name}</span>
                  <span className="block text-sm text-dim">
                    {p.weeks} weeks, {p.days.length} days a week
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
      {assigning && <AssignSheet open onClose={() => setAssigning(null)} program={assigning} clients={[client]} preset={[client.id]} onDone={reload} />}
      <NewInvoiceSheet open={invoicing} onClose={() => setInvoicing(false)} clients={[client]} plans={plans} presetClient={client.id} existing={data.allInvoices} onCreated={reload} />
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <Profile />
      </Suspense>
    </AppShell>
  );
}
