"use client";

import Link from "next/link";
import { useState } from "react";
import { intervalLabel, invoiceNo, invoiceStatus, money, oneOffInvoice, type Invoice, type MembershipPlan, type PayMethod } from "@/lib/billing";
import { BRAND } from "@/lib/brand";
import { store } from "@/lib/store";
import { addDays, fmtDate, fullName, todayISO, type Client } from "@/lib/types";
import { Field, Pill, Sheet } from "./ui";

export function StatusPill({ inv }: { inv: Invoice }) {
  const st = invoiceStatus(inv, todayISO());
  return <Pill tone={st === "paid" ? "good" : st === "overdue" ? "bad" : st === "open" ? "warn" : "neutral"}>{st === "paid" ? "Paid" : st === "overdue" ? "Overdue" : st === "open" ? "Open" : "Void"}</Pill>;
}

const METHODS: [PayMethod, string][] = [
  ["card", "Card"],
  ["bank", "Bank transfer"],
  ["cash", "Cash"],
  ["check", "Check"],
  ["other", "Other"],
];
export const methodLabel = (m: PayMethod | null) => METHODS.find((x) => x[0] === m)?.[1] ?? "";

export function MarkPaidSheet({ invoice, onClose, onSaved }: { invoice: Invoice | null; onClose: () => void; onSaved: (inv: Invoice) => void }) {
  const [method, setMethod] = useState<PayMethod>("cash");
  return (
    <Sheet open={!!invoice} onClose={onClose} title="Record a payment">
      {invoice && (
        <div className="space-y-5">
          <p className="text-dim">
            {invoiceNo(invoice.number)} for <span className="text-ink">{money(invoice.total)}</span>. How was it paid?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map(([k, l]) => (
              <button key={k} onClick={() => setMethod(k)} className={`rounded-[12px] px-4 py-3 text-left text-[15px] transition-colors ${method === k ? "bg-paper text-bg" : "bg-white/[0.05] hover:bg-white/[0.08]"}`}>
                {l}
              </button>
            ))}
          </div>
          <button
            className="btn btn-primary w-full"
            onClick={async () => {
              const paid: Invoice = { ...invoice, status: "paid", paid_at: todayISO(), method };
              await store.put("invoice", paid);
              onSaved(paid);
              onClose();
            }}
          >
            Mark as paid
          </button>
        </div>
      )}
    </Sheet>
  );
}

export function InvoiceList({ invoices, clients, onChange, empty }: { invoices: Invoice[]; clients?: Record<string, Client>; onChange: () => void; empty: string }) {
  const [paying, setPaying] = useState<Invoice | null>(null);
  if (invoices.length === 0) return <p className="py-6 text-dim">{empty}</p>;
  return (
    <>
      <ul>
        {invoices.map((inv) => (
          <li key={inv.id} className="flex items-center gap-4 border-t border-hair py-3.5 first:border-0">
            <Link href={`/billing/${inv.id}`} className="grid min-w-0 flex-1 grid-cols-[1fr_auto] items-center gap-x-4 hover:text-ice sm:grid-cols-[84px_1fr_auto_auto]">
              <span className="num hidden text-sm text-dim sm:block">{invoiceNo(inv.number)}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{clients ? (clients[inv.client_id] ? fullName(clients[inv.client_id]) : "Former athlete") : inv.lines[0]?.label}</span>
                <span className="block truncate text-sm text-dim">
                  {clients ? `${inv.lines[0]?.label}, ` : ""}
                  {inv.status === "paid" ? `${clients ? "paid" : "Paid"} ${fmtDate(inv.paid_at!)}` : `${clients ? "due" : "Due"} ${fmtDate(inv.due)}`}
                </span>
              </span>
              <span className="hidden sm:block">
                <StatusPill inv={inv} />
              </span>
              <span className="num w-20 text-right">{money(inv.total)}</span>
            </Link>
            {inv.status === "open" ? (
              <button className="btn btn-quiet !min-h-9 !px-3.5 text-sm" onClick={() => setPaying(inv)}>
                Record payment
              </button>
            ) : (
              <span className="hidden w-[132px] text-right text-sm text-faint sm:block">{methodLabel(inv.method)}</span>
            )}
          </li>
        ))}
      </ul>
      <MarkPaidSheet invoice={paying} onClose={() => setPaying(null)} onSaved={onChange} />
    </>
  );
}

export function NewInvoiceSheet({ open, onClose, clients, plans, presetClient, existing, onCreated }: { open: boolean; onClose: () => void; clients: Client[]; plans: MembershipPlan[]; presetClient?: string; existing: Invoice[]; onCreated: () => void }) {
  const [clientId, setClientId] = useState(presetClient ?? "");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const oneTime = plans.filter((p) => p.active && p.interval === "once");
  const ok = clientId && label.trim() && Number(amount) > 0;
  return (
    <Sheet open={open} onClose={onClose} title="New invoice">
      <div className="space-y-4">
        {!presetClient && (
          <Field label="Athlete">
            <select className="field" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Choose an athlete</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {fullName(c)}
                </option>
              ))}
            </select>
          </Field>
        )}
        {oneTime.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {oneTime.map((p) => (
              <button key={p.id} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-sm hover:bg-white/[0.1]" onClick={() => (setLabel(p.name), setAmount(String(p.price)))}>
                {p.name}, {money(p.price)}
              </button>
            ))}
          </div>
        )}
        <Field label="What it's for">
          <input className="field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Movement scan" />
        </Field>
        <Field label="Amount">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">$</span>
            <input className="field !pl-8" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
          </div>
        </Field>
        <button
          className="btn btn-primary w-full"
          disabled={!ok}
          onClick={async () => {
            const today = todayISO();
            await store.put("invoice", oneOffInvoice(existing, clientId, label.trim(), Number(amount), today, addDays(today, 5)));
            setLabel("");
            setAmount("");
            onCreated();
            onClose();
          }}
        >
          Create invoice
        </button>
      </div>
    </Sheet>
  );
}

// The invoice document. White paper wherever it appears, so the screen matches the printout.
export function InvoicePaper({ invoice, gymName, billTo, athlete }: { invoice: Invoice; gymName: string; billTo: string; athlete: string }) {
  const st = invoiceStatus(invoice, todayISO());
  return (
    <div className="paper mx-auto w-full max-w-[720px] px-7 py-9 sm:px-12 sm:py-12">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xl font-semibold tracking-tight">{gymName}</p>
          <p className="mt-1 text-sm text-[#5b636c]">Invoice {invoiceNo(invoice.number)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st === "paid" ? "bg-[#e3f3ea] text-[#12714a]" : st === "overdue" ? "bg-[#fde8ec] text-[#b4173a]" : "bg-[#eef0f2] text-[#3d444c]"}`}>
          {st === "paid" ? `Paid ${fmtDate(invoice.paid_at!)}` : st === "overdue" ? "Overdue" : st === "void" ? "Void" : `Due ${fmtDate(invoice.due)}`}
        </span>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="text-[#98a0a8]">Billed to</p>
          <p className="mt-1 font-medium">{billTo}</p>
          {billTo !== athlete && <p className="text-[#5b636c]">For {athlete}</p>}
        </div>
        <div className="text-right">
          <p className="text-[#98a0a8]">Issued</p>
          <p className="mt-1 font-medium">{fmtDate(invoice.issued, { month: "long", day: "numeric", year: "numeric" })}</p>
        </div>
      </div>

      <table className="mt-10 w-full text-[15px]">
        <thead>
          <tr className="border-b border-[#dfe2e6] text-left text-sm text-[#98a0a8]">
            <th className="pb-3 font-normal">Description</th>
            <th className="pb-3 text-right font-normal">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((l, i) => (
            <tr key={i} className="border-b border-[#eef0f2]">
              <td className="py-4">{l.label}</td>
              <td className="num py-4 text-right">{money(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex items-baseline justify-end gap-8">
        <span className="text-sm text-[#5b636c]">{st === "paid" ? "Total paid" : "Total due"}</span>
        <span className="text-4xl font-light tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
          {money(invoice.total)}
        </span>
      </div>
      {invoice.status === "paid" && invoice.method && <p className="mt-2 text-right text-sm text-[#5b636c]">Paid by {methodLabel(invoice.method).toLowerCase()}</p>}

      <p className="mt-14 border-t border-[#eef0f2] pt-5 text-xs text-[#98a0a8]">
        Thank you for training with {gymName}. Sent with {BRAND.name}.
      </p>
    </div>
  );
}

export const planPrice = (p: Pick<MembershipPlan, "price" | "interval">) => `${money(p.price)} ${intervalLabel(p.interval)}`;
