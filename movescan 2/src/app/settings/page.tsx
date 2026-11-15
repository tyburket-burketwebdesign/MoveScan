"use client";

import { useEffect, useState } from "react";
import AppShell, { Loading, PageHeader } from "@/components/AppShell";
import { DEFAULT_BATTERY } from "@/lib/battery";
import { PLANS, TRIAL_DAYS, type PlanKey } from "@/lib/plans";
import type { GymSettings, TeamMember } from "@/lib/types";
import { useSettings } from "@/lib/useSettings";

function Settings() {
  const { settings, save } = useSettings();
  const [draft, setDraft] = useState<Pick<GymSettings, "gymName" | "ownerName" | "assessmentPrice"> | null>(null);
  const [saved, setSaved] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "" });
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    if (settings && !draft) setDraft({ gymName: settings.gymName, ownerName: settings.ownerName, assessmentPrice: settings.assessmentPrice });
  }, [settings, draft]);

  if (!settings || !draft) return <Loading />;

  const dirty = draft.gymName !== settings.gymName || draft.ownerName !== settings.ownerName || draft.assessmentPrice !== settings.assessmentPrice;
  const trialLeft = settings.planStartedAt ? Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - new Date(settings.planStartedAt).getTime()) / 864e5)) : null;

  const choose = (key: PlanKey) => save({ plan: key, planStartedAt: settings.plan ? settings.planStartedAt : new Date().toISOString() });
  const addMember = () => {
    if (!invite.name.trim() || !invite.email.includes("@")) return;
    const m: TeamMember = { name: invite.name.trim(), email: invite.email.trim(), role: "Trainer" };
    save({ team: [...settings.team, m] });
    setInvite({ name: "", email: "" });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" sub="Your gym, your plan and your team." />

      <section className="surface grid gap-8 px-6 py-8 sm:px-10 lg:grid-cols-[260px_1fr]">
        <div>
          <h2 className="text-lg font-semibold">Gym</h2>
          <p className="mt-1 text-sm text-dim">Your gym&apos;s name goes on every athlete report and email.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-dim">Gym name</span>
            <input className="field" value={draft.gymName} onChange={(e) => setDraft({ ...draft, gymName: e.target.value })} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-dim">Your name</span>
            <input className="field" value={draft.ownerName} onChange={(e) => setDraft({ ...draft, ownerName: e.target.value })} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-dim">What you charge per scan</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">$</span>
              <input
                className="field !pl-8"
                inputMode="numeric"
                value={draft.assessmentPrice}
                onChange={(e) => setDraft({ ...draft, assessmentPrice: Number(e.target.value.replace(/\D/g, "")) || 0 })}
              />
            </div>
            <span className="text-xs text-faint">Used for scan revenue on Today.</span>
          </label>
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
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Plan</h2>
            <p className="mt-1 text-sm text-dim">
              {settings.plan
                ? trialLeft
                  ? `You're on a free trial of ${PLANS.find((p) => p.key === settings.plan)!.name}. ${trialLeft} days left.`
                  : `You're on ${PLANS.find((p) => p.key === settings.plan)!.name}.`
                : `Every plan starts with a ${TRIAL_DAYS}-day free trial. No card needed to start.`}
            </p>
          </div>
          <div className="inline-flex rounded-[12px] bg-white/[0.04] p-1" role="tablist" aria-label="Billing period">
            {(["monthly", "annual"] as const).map((b) => (
              <button
                key={b}
                role="tab"
                aria-selected={billing === b}
                onClick={() => setBilling(b)}
                className={`rounded-[9px] px-4 py-2 text-sm ${billing === b ? "bg-raised text-ink" : "text-dim hover:text-ink"}`}
              >
                {b === "monthly" ? "Monthly" : "Annual, 2 months free"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((p) => {
            const current = settings.plan === p.key;
            const featured = p.key === "performance";
            const price = billing === "monthly" ? p.price : Math.round((p.price * 10) / 12);
            return (
              <div
                key={p.key}
                className={`flex flex-col rounded-[16px] p-6 ${
                  featured ? "bg-white/[0.05] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]" : "shadow-[inset_0_0_0_1px_var(--color-hair)]"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl font-semibold">{p.name}</h3>
                  {featured && <span className="text-xs text-dim">Most popular</span>}
                </div>
                <p className="mt-1 min-h-10 text-sm text-dim">{p.pitch}</p>
                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="readout text-6xl">${price}</span>
                  <span className="text-dim">/ month</span>
                </p>
                <p className="mt-2 text-sm text-faint">
                  Up to {p.athletes} athletes{billing === "annual" ? `, billed $${(p.price * 10).toLocaleString()} a year` : ""}
                </p>
                <ul className="my-7 space-y-2.5 text-[15px]">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-3">
                      <svg className="mt-[5px] shrink-0 text-ice" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={`btn mt-auto w-full ${current ? "btn-quiet" : featured ? "btn-primary" : "btn-quiet"}`} disabled={current} onClick={() => choose(p.key)}>
                  {current ? "Current plan" : settings.plan ? `Switch to ${p.name}` : `Start free trial`}
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-sm text-faint">Teams, colleges and multi-location groups get custom pricing from $10,000 a year.</p>
      </section>

      <section className="surface grid gap-8 px-6 py-8 sm:px-10 lg:grid-cols-[260px_1fr]">
        <div>
          <h2 className="text-lg font-semibold">Team</h2>
          <p className="mt-1 text-sm text-dim">Trainers can run scans and send reports. Owners also manage the plan and programs.</p>
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
                <span className="text-sm text-dim">{m.role}</span>
                {m.role !== "Owner" && (
                  <button className="text-sm text-faint hover:text-hot" onClick={() => save({ team: settings.team.filter((_, j) => j !== i) })}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input className="field" placeholder="Name" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} aria-label="Trainer name" />
            <input className="field" type="email" placeholder="Email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} aria-label="Trainer email" />
            <button className="btn btn-quiet" onClick={addMember} disabled={!invite.name.trim() || !invite.email.includes("@")}>
              Add trainer
            </button>
          </div>
        </div>
      </section>

      <section className="surface grid gap-8 px-6 py-8 sm:px-10 lg:grid-cols-[260px_1fr]">
        <div>
          <h2 className="text-lg font-semibold">Test battery</h2>
          <p className="mt-1 text-sm text-dim">The six movements every scan runs. Custom batteries come with Elite.</p>
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
