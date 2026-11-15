"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import AppShell, { Loading, PageHeader } from "@/components/AppShell";
import { InvoiceList, NewInvoiceSheet, planPrice } from "@/components/BillingBits";
import { Avatar, Field, Pill, Segmented, Sheet } from "@/components/ui";
import { billingSummary, invoiceStatus, money, nextBillDate, type Interval, type MembershipPlan } from "@/lib/billing";
import { PLATFORM_FEE_PCT, CARD_PCT, CARD_FIXED } from "@/lib/plans";
import { loadGym, store } from "@/lib/store";
import { newId } from "@/lib/training";
import { fmtDate, fullName, todayISO } from "@/lib/types";
import { useLoad, useSettings } from "@/lib/useSettings";

type Tab = "invoices" | "members" | "plans";
type Filter = "all" | "open" | "overdue" | "paid";

function Billing() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "invoices");
  const [filter, setFilter] = useState<Filter>("all");
  const [gym, reload] = useLoad(loadGym);
  const [plans, reloadPlans] = useLoad(() => store.list("plan"));
  const { settings, save } = useSettings();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<MembershipPlan | null>(null);
  const [all, setAll] = useState(false);
  const today = todayISO();

  const byId = useMemo(() => Object.fromEntries((gym?.clients ?? []).map((c) => [c.id, c])), [gym]);
  if (!gym || !plans || !settings) return <Loading />;
  const sum = billingSummary(gym.subs, gym.invoices, today);
  const invoices = gym.invoices
    .filter((i) => i.status !== "void")
    .filter((i) => filter === "all" || invoiceStatus(i, today) === filter || (filter === "open" && invoiceStatus(i, today) === "overdue"))
    .sort((a, b) => b.number - a.number);
  const members = gym.subs.filter((s) => s.status !== "canceled" && byId[s.client_id]).sort((a, b) => fullName(byId[a.client_id]).localeCompare(fullName(byId[b.client_id])));
  const without = gym.clients.filter((c) => !members.some((m) => m.client_id === c.id));

  return (
    <div>
      <PageHeader title="Billing" sub="Memberships bill themselves. You see what's paid and who's behind.">
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          New invoice
        </button>
      </PageHeader>

      {!settings.payoutsConnected && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-hair px-6 py-5">
          <div>
            <p className="font-semibold">Turn on card payments</p>
            <p className="mt-1 text-sm text-dim">
              Athletes pay invoices from their app and the money lands in your bank. {CARD_PCT}% + {Math.round(CARD_FIXED * 100)}¢ card processing, plus a {PLATFORM_FEE_PCT}% platform fee.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => save({ payoutsConnected: true })}>
            Connect payouts
          </button>
        </div>
      )}

      <section className="surface grid grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Monthly recurring revenue", value: money(Math.round(sum.mrr)), foot: `${sum.members} active memberships` },
          { label: "Collected this month", value: money(Math.round(sum.collected)), foot: fmtDate(today, { month: "long", year: "numeric" }) },
          { label: "Outstanding", value: money(Math.round(sum.outstanding)), foot: `${sum.openCount} open ${sum.openCount === 1 ? "invoice" : "invoices"}` },
          { label: "Overdue", value: money(Math.round(sum.overdue)), foot: sum.overdueCount ? `${sum.overdueCount} past due` : "Nobody is behind", color: sum.overdue ? "var(--color-hot)" : undefined },
        ].map((k, i) => (
          <div key={k.label} className={`px-6 py-7 sm:px-8 ${i % 2 ? "border-l border-hair" : ""} ${i > 1 ? "border-t border-hair lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}>
            <p className="text-sm text-dim">{k.label}</p>
            <p className="readout mt-4 text-4xl sm:text-5xl" style={{ color: k.color }}>
              {k.value}
            </p>
            <p className="mt-4 text-[13px] text-dim">{k.foot}</p>
          </div>
        ))}
      </section>

      <div className="mb-5 mt-8 flex flex-wrap items-center justify-between gap-4">
        <Segmented
          value={tab}
          onChange={setTab}
          label="Billing sections"
          options={[
            ["invoices", "Invoices"],
            ["members", `Memberships (${members.length})`],
            ["plans", "Plans"],
          ]}
        />
        {tab === "invoices" && (
          <Segmented
            value={filter}
            onChange={setFilter}
            label="Invoice status"
            options={[
              ["all", "All"],
              ["open", "Unpaid"],
              ["overdue", "Overdue"],
              ["paid", "Paid"],
            ]}
          />
        )}
        {tab === "plans" && (
          <button className="btn btn-quiet" onClick={() => setEditing({ id: "", name: "", price: 0, interval: "month", description: "", active: true })}>
            New plan
          </button>
        )}
      </div>

      {tab === "invoices" && (
        <section className="surface px-6 py-3 sm:px-8">
          <InvoiceList invoices={all ? invoices : invoices.slice(0, 12)} clients={byId} onChange={reload} empty={filter === "all" ? "No invoices yet. They appear as memberships bill." : "Nothing here."} />
          {!all && invoices.length > 12 && (
            <button className="w-full border-t border-hair py-4 text-[15px] text-dim hover:text-ink" onClick={() => setAll(true)}>
              Show all {invoices.length} invoices
            </button>
          )}
        </section>
      )}

      {tab === "members" && (
        <div className="space-y-6">
          <section className="surface px-6 py-3 sm:px-8">
            {members.length === 0 ? (
              <p className="py-6 text-dim">No memberships yet. Open an athlete and start one from their Billing tab.</p>
            ) : (
              <ul>
                {members.map((s) => {
                  const c = byId[s.client_id];
                  const next = nextBillDate(s, today);
                  return (
                    <li key={s.id} className="border-t border-hair first:border-0">
                      <Link href={`/clients/${c.id}?tab=billing`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3.5 hover:text-ice sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_90px]">
                        <span className="flex min-w-0 items-center gap-3">
                          <Avatar who={c} size={36} />
                          <span className="truncate font-medium">{fullName(c)}</span>
                        </span>
                        <span className="hidden truncate text-dim sm:block">{s.name}</span>
                        <span className="hidden sm:block">{s.status === "active" ? <span className="text-sm text-dim">Next {next ? fmtDate(next) : ""}</span> : <Pill tone="warn">Paused</Pill>}</span>
                        <span className="num text-right">{money(s.price)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          {without.length > 0 && (
            <section className="surface px-6 py-6 sm:px-8">
              <h2 className="text-lg font-semibold">Not on a membership</h2>
              <p className="mt-1 text-sm text-dim">Open an athlete to start their membership.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {without.map((c) => (
                  <Link key={c.id} href={`/clients/${c.id}?tab=billing`} className="rounded-full bg-white/[0.05] px-3.5 py-1.5 text-sm hover:bg-white/[0.1]">
                    {fullName(c)}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {tab === "plans" && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => {
            const count = gym.subs.filter((s) => s.plan_id === p.id && s.status === "active").length;
            return (
              <button key={p.id} className={`surface flex min-h-44 flex-col p-6 text-left transition-transform hover:-translate-y-0.5 ${p.active ? "" : "opacity-50"}`} onClick={() => setEditing(p)}>
                <span className="flex items-start justify-between gap-3">
                  <span className="text-lg font-semibold">{p.name}</span>
                  {!p.active ? <Pill>Hidden</Pill> : count > 0 ? <Pill tone="good">{count} athletes</Pill> : null}
                </span>
                <span className="mt-1 text-sm text-dim">{p.description}</span>
                <span className="mt-auto flex items-baseline gap-2 pt-6">
                  <span className="readout text-5xl">{money(p.price)}</span>
                  <span className="text-dim">{p.interval === "once" ? "one time" : p.interval === "week" ? "a week" : "a month"}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <NewInvoiceSheet open={creating} onClose={() => setCreating(false)} clients={gym.clients} plans={plans} existing={gym.invoices} onCreated={reload} />
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit plan" : "New plan"}>
        {editing && <PlanForm key={editing.id || "new"} plan={editing} onSaved={() => (setEditing(null), reloadPlans())} />}
      </Sheet>
    </div>
  );
}

function PlanForm({ plan, onSaved }: { plan: MembershipPlan; onSaved: () => void }) {
  const [f, setF] = useState({ ...plan, price: plan.price ? String(plan.price) : "" });
  return (
    <div className="space-y-4">
      <Field label="Name">
        <input className="field" value={f.name} placeholder="3 sessions a week" onChange={(e) => setF({ ...f, name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Price">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">$</span>
            <input className="field !pl-8" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/[^\d.]/g, "") })} />
          </div>
        </Field>
        <Field label="Billed">
          <select className="field" value={f.interval} onChange={(e) => setF({ ...f, interval: e.target.value as Interval })}>
            <option value="month">Every month</option>
            <option value="week">Every week</option>
            <option value="once">One time</option>
          </select>
        </Field>
      </div>
      <Field label="Description">
        <input className="field" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      </Field>
      {plan.id && (
        <label className="flex cursor-pointer items-center gap-3 text-[15px]">
          <input type="checkbox" className="h-5 w-5 accent-[var(--color-ice)]" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          Offer this plan to new athletes
        </label>
      )}
      {plan.id && <p className="text-sm text-faint">Athletes already on this plan keep the price they signed up at. {planPrice(plan)} today.</p>}
      <button
        className="btn btn-primary w-full"
        disabled={!f.name.trim() || !(Number(f.price) > 0)}
        onClick={async () => {
          await store.put("plan", { ...f, id: plan.id || newId(), name: f.name.trim(), price: Number(f.price) });
          onSaved();
        }}
      >
        {plan.id ? "Save plan" : "Create plan"}
      </button>
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <Billing />
      </Suspense>
    </AppShell>
  );
}
