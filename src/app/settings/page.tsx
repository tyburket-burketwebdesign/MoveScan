"use client";

import { useEffect, useState } from "react";
import AppShell, { Loading, PageHeader } from "@/components/AppShell";
import { Check, Field, Pill } from "@/components/ui";
import { DEFAULT_BATTERY } from "@/lib/battery";
import { money, mrr } from "@/lib/billing";
import { BRAND } from "@/lib/brand";
import { ATHLETE_TIERS, CARD_FIXED, CARD_PCT, PLANS, PLATFORM_FEE_PCT, platformBill, PRO_PRICE, TRIAL_DAYS, type PlanKey } from "@/lib/plans";
import { store } from "@/lib/store";
import type { GymSettings, TeamMember } from "@/lib/types";
import { useLoad, useSettings } from "@/lib/useSettings";

const ACCENTS = ["#8fd5ff", "#ffb04a", "#ff5577", "#7ee0a8", "#c9a7ff", "#f5f6f7"];

function Settings() {
  const { settings, save } = useSettings();
  const [clients] = useLoad(() => store.listClients());
  const [subs] = useLoad(() => store.list("subscription"));
  const [draft, setDraft] = useState<Pick<GymSettings, "gymName" | "ownerName" | "assessmentPrice"> | null>(null);
  const [saved, setSaved] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "" });
  const [what, setWhat] = useState<number | null>(null);

  useEffect(() => {
    if (settings && !draft) setDraft({ gymName: settings.gymName, ownerName: settings.ownerName, assessmentPrice: settings.assessmentPrice });
  }, [settings, draft]);

  if (!settings || !draft || !clients) return <Loading />;

  const active = clients.filter((c) => !c.archived).length;
  const n = what ?? active;
  const plan: PlanKey = settings.plan ?? "core";
  const bill = platformBill(n, plan);
  const dirty = draft.gymName !== settings.gymName || draft.ownerName !== settings.ownerName || draft.assessmentPrice !== settings.assessmentPrice;
  const trialLeft = settings.planStartedAt ? Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - new Date(settings.planStartedAt).getTime()) / 864e5)) : null;
  const choose = (key: PlanKey) => save({ plan: key, planStartedAt: settings.planStartedAt ?? new Date().toISOString() });
  const addMember = () => {
    if (!invite.name.trim() || !invite.email.includes("@")) return;
    const m: TeamMember = { name: invite.name.trim(), email: invite.email.trim(), role: "Trainer" };
    save({ team: [...settings.team, m] });
    setInvite({ name: "", email: "" });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" sub="Your gym, your plan and how you get paid." />

      <section className="surface grid gap-8 px-6 py-8 sm:px-10 lg:grid-cols-[260px_1fr]">
        <div>
          <h2 className="text-lg font-semibold">Gym</h2>
          <p className="mt-1 text-sm text-dim">Your gym&apos;s name is on the athlete app, every report and every invoice.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Gym name">
            <input className="field" value={draft.gymName} onChange={(e) => setDraft({ ...draft, gymName: e.target.value })} />
          </Field>
          <Field label="Your name">
            <input className="field" value={draft.ownerName} onChange={(e) => setDraft({ ...draft, ownerName: e.target.value })} />
          </Field>
          <Field label="What you charge for a scan" hint="Pre-fills one-time scan invoices.">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">$</span>
              <input className="field !pl-8" inputMode="numeric" value={draft.assessmentPrice} onChange={(e) => setDraft({ ...draft, assessmentPrice: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
            </div>
          </Field>
          <Field label="Athlete app color" hint="Shown on buttons and progress in your athletes' app.">
            <div className="flex h-12 items-center gap-2.5">
              {ACCENTS.map((c) => (
                <button key={c} aria-label={`Use ${c}`} aria-pressed={(settings.accent ?? ACCENTS[0]) === c} onClick={() => save({ accent: c })} className="grid h-9 w-9 place-items-center rounded-full text-bg transition-transform hover:scale-110" style={{ background: c }}>
                  {(settings.accent ?? ACCENTS[0]) === c && <Check size={14} />}
                </button>
              ))}
              <Pill>Pro</Pill>
            </div>
          </Field>
          <div className="flex items-end gap-3 sm:col-span-2">
            <button
              className="btn btn-primary"
              disabled={!dirty}
              onClick={async () => {
                await save(draft);
                setSaved(true);
                setTimeout(() => setSaved(false), 2200);
              }}
            >
              Save changes
            </button>
            {saved && <span className="pb-3 text-sm text-ice">Saved</span>}
          </div>
        </div>
      </section>

      <section id="plan" className="surface scroll-mt-8 px-6 py-8 sm:px-10">
        <div className="mb-8">
          <h2 className="text-lg font-semibold">Your {BRAND.name} plan</h2>
          <p className="mt-1 text-sm text-dim">
            {settings.plan
              ? trialLeft
                ? `You're on a free trial of ${PLANS.find((p) => p.key === settings.plan)!.name}. ${trialLeft} days left, and nothing is charged until it ends.`
                : `You're on ${PLANS.find((p) => p.key === settings.plan)!.name}.`
              : `No license fee. You pay for the athletes you train, and the first ${TRIAL_DAYS} days are free.`}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
          {PLANS.map((p) => {
            const current = settings.plan === p.key;
            return (
              <div key={p.key} className={`flex flex-col rounded-[16px] p-6 ${current ? "bg-white/[0.05] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]" : "shadow-[inset_0_0_0_1px_var(--color-hair)]"}`}>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl font-semibold">{p.name}</h3>
                  {current && <span className="text-xs text-dim">Current plan</span>}
                </div>
                <p className="mt-1 min-h-10 text-sm text-dim">{p.pitch}</p>
                <p className="mt-6 flex flex-wrap items-baseline gap-x-2">
                  <span className="readout text-6xl">{p.price}</span>
                  <span className="text-dim">{p.unit}</span>
                </p>
                <ul className="my-7 space-y-2.5 text-[15px]">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-3">
                      <span className="mt-[5px] shrink-0 text-ice">
                        <Check size={13} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={`btn mt-auto w-full ${current ? "btn-quiet" : "btn-primary"}`} disabled={current} onClick={() => choose(p.key)}>
                  {current ? "Current plan" : settings.plan ? `Switch to ${p.name}` : "Start free trial"}
                </button>
              </div>
            );
          })}

          <div className="flex flex-col rounded-[16px] bg-black/25 p-6">
            <h3 className="text-xl font-semibold">Your bill</h3>
            <p className="mt-1 text-sm text-dim">Billed monthly on active athletes. Archive an athlete and they stop counting.</p>
            <label className="mt-6 block">
              <span className="flex items-baseline justify-between text-sm text-dim">
                <span>Athletes</span>
                <span className="num text-ink">
                  {n}
                  {what === null ? " today" : ""}
                </span>
              </span>
              <input type="range" min={1} max={200} value={n} onChange={(e) => setWhat(Number(e.target.value))} className="mt-3 w-full accent-[var(--color-paper)]" aria-label="Number of athletes" />
            </label>
            <dl className="mt-5 space-y-2 text-[15px]">
              <div className="flex justify-between">
                <dt className="text-dim">Athletes</dt>
                <dd className="num">{money(bill.perAthlete)}</dd>
              </div>
              {bill.base > 0 && (
                <div className="flex justify-between">
                  <dt className="text-dim">Pro</dt>
                  <dd className="num">{money(PRO_PRICE)}</dd>
                </div>
              )}
            </dl>
            {what === null && subs && mrr(subs) > 0 && (
              <p className="mt-6 rounded-[12px] bg-white/[0.04] px-4 py-3 text-sm text-dim">
                That&apos;s <span className="text-ink">{((bill.total / mrr(subs)) * 100).toFixed(1)}%</span> of the {money(Math.round(mrr(subs)))} your memberships bring in each month.
              </p>
            )}
            <p className="mt-auto flex items-baseline justify-between border-t border-hair pt-5">
              <span className="text-dim">A month</span>
              <span className="readout text-5xl">{money(bill.total)}</span>
            </p>
            <p className="mt-2 text-right text-sm text-faint">{money(bill.effective)} per athlete</p>
            {what !== null && (
              <button className="mt-3 self-end text-sm text-dim hover:text-ink" onClick={() => setWhat(null)}>
                Back to my {active} athletes
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-sm text-faint">
          Athlete rates: {ATHLETE_TIERS.map((t, i) => `${money(t.rate)} ${i === 0 ? `for the first ${t.upTo}` : t.upTo === Infinity ? "after that" : `up to ${t.upTo}`}`).join(", ")}. Teams, schools and multi-location groups get custom pricing.
        </p>
      </section>

      <section className="surface grid gap-8 px-6 py-8 sm:px-10 lg:grid-cols-[260px_1fr]">
        <div>
          <h2 className="text-lg font-semibold">Getting paid</h2>
          <p className="mt-1 text-sm text-dim">How athlete payments reach you.</p>
        </div>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2.5 font-medium">
                Card payments {settings.payoutsConnected ? <Pill tone="good">On</Pill> : <Pill>Off</Pill>}
              </p>
              <p className="mt-1 max-w-md text-sm text-dim">
                Athletes pay invoices from their app. {CARD_PCT}% + {Math.round(CARD_FIXED * 100)}¢ card processing and a {PLATFORM_FEE_PCT}% platform fee come out of each payment. Cash and checks are free to record.
              </p>
            </div>
            <button className={`btn ${settings.payoutsConnected ? "btn-quiet" : "btn-primary"}`} onClick={() => save({ payoutsConnected: !settings.payoutsConnected })}>
              {settings.payoutsConnected ? "Turn off" : "Connect payouts"}
            </button>
          </div>
          <label className="flex cursor-pointer items-start gap-4 border-t border-hair pt-6">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-ice)]" checked={settings.passAthleteFee} onChange={(e) => save({ passAthleteFee: e.target.checked })} />
            <span>
              <span className="block font-medium">Pass the athlete fee on</span>
              <span className="mt-1 block max-w-md text-sm text-dim">
                Adds a {money(ATHLETE_TIERS[0].rate)} line, &ldquo;Athlete app and movement scans&rdquo;, to each new membership invoice, so {BRAND.name} costs you nothing.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="surface grid gap-8 px-6 py-8 sm:px-10 lg:grid-cols-[260px_1fr]">
        <div>
          <h2 className="text-lg font-semibold">Team</h2>
          <p className="mt-1 text-sm text-dim">Coaches can scan, program and send reports. Owners also manage billing and the plan. Core includes one coach.</p>
        </div>
        <div>
          <ul className="divide-y divide-[var(--color-hair)]">
            {settings.team.map((m, i) => (
              <li key={m.email + i} className="flex items-center gap-4 py-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-raised text-sm font-semibold text-dim">{m.name[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{m.name}</span>
                  <span className="block truncate text-sm text-dim">{m.email}</span>
                </span>
                <span className="text-sm text-dim">{m.role === "Owner" ? "Owner" : "Coach"}</span>
                {m.role !== "Owner" && (
                  <button className="text-sm text-faint hover:text-hot" onClick={() => save({ team: settings.team.filter((_, j) => j !== i) })}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input className="field" placeholder="Name" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} aria-label="Coach name" />
            <input className="field" type="email" placeholder="Email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} aria-label="Coach email" />
            <button className="btn btn-quiet" onClick={addMember} disabled={!invite.name.trim() || !invite.email.includes("@")}>
              Add coach
            </button>
          </div>
        </div>
      </section>

      <section className="surface grid gap-8 px-6 py-8 sm:px-10 lg:grid-cols-[260px_1fr]">
        <div>
          <h2 className="text-lg font-semibold">Movement scan</h2>
          <p className="mt-1 text-sm text-dim">The six movements every scan runs. Custom batteries come with Pro.</p>
        </div>
        <ol className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {DEFAULT_BATTERY.map((m, i) => (
            <li key={m.key} className="flex gap-4">
              <span className="w-4 text-faint">{i + 1}</span>
              <span>
                <span className="block font-medium">{m.label}</span>
                <span className="block text-sm text-dim">{m.compensations.length} compensations checked</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Settings />
    </AppShell>
  );
}
