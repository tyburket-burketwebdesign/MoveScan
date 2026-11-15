// Athlete billing: the membership plans a gym sells, each athlete's subscription, and the invoices
// those subscriptions produce. Card charging is not connected yet, so invoices are settled by
// marking them paid (cash, check, or the pass-through "pay" in the athlete app).
import { addDays, addMonths } from "./types";

export type Interval = "month" | "week" | "once";
export type PayMethod = "card" | "bank" | "cash" | "check" | "other";

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  interval: Interval;
  description: string;
  active: boolean;
}
export interface Subscription {
  id: string;
  client_id: string;
  plan_id: string;
  name: string; // snapshot of the plan at sign-up
  price: number;
  interval: "month" | "week";
  start: string; // first billing date
  status: "active" | "paused" | "canceled";
  resume_from: string | null; // periods before this date are skipped (set when a pause ends)
}
export interface InvoiceLine {
  label: string;
  amount: number;
}
export interface Invoice {
  id: string;
  number: number;
  client_id: string;
  subscription_id: string | null;
  period: string | null; // subscription:periodStart, so a period can never be invoiced twice
  lines: InvoiceLine[];
  total: number;
  issued: string;
  due: string;
  status: "open" | "paid" | "void";
  paid_at: string | null;
  method: PayMethod | null;
  sent_at: string | null;
}

export const DUE_DAYS = 5;
const round2 = (n: number) => Math.round(n * 100) / 100;

export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
export const invoiceNo = (n: number) => `INV-${String(n).padStart(4, "0")}`;
export const intervalLabel = (i: Interval) => (i === "month" ? "a month" : i === "week" ? "a week" : "one time");

export const monthlyValue = (s: Pick<Subscription, "price" | "interval">) => (s.interval === "week" ? (s.price * 52) / 12 : s.price);
export const mrr = (subs: Subscription[]) => round2(subs.filter((s) => s.status === "active").reduce((t, s) => t + monthlyValue(s), 0));

const periodStart = (s: Subscription, k: number) => (s.interval === "week" ? addDays(s.start, 7 * k) : addMonths(s.start, k));

export function nextBillDate(s: Subscription, today: string) {
  if (s.status !== "active") return null;
  for (let k = 0; k < 1000; k++) {
    const p = periodStart(s, k);
    if (p > today) return p;
  }
  return null;
}

export const invoiceStatus = (inv: Invoice, today: string): "paid" | "void" | "overdue" | "open" =>
  inv.status === "open" && inv.due < today ? "overdue" : inv.status;

const periodLabel = (s: Subscription, p: string) => {
  const d = new Date(p + "T00:00:00");
  return s.interval === "week" ? `week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

// Every active subscription gets one invoice per billing period that has started. Ids are derived
// from the period, so running this twice (or on two devices) can never bill a period twice.
export function generateInvoices(subs: Subscription[], existing: Invoice[], today: string, opts: { athleteFee?: number } = {}): Invoice[] {
  const have = new Set(existing.map((i) => i.period).filter(Boolean));
  let number = existing.reduce((m, i) => Math.max(m, i.number), 0);
  const fresh: Invoice[] = [];
  for (const s of subs) {
    if (s.status !== "active") continue;
    for (let k = 0; k < 1000; k++) {
      const p = periodStart(s, k);
      if (p > today) break;
      if (s.resume_from && p < s.resume_from) continue;
      const period = `${s.id}:${p}`;
      if (have.has(period)) continue;
      const lines: InvoiceLine[] = [{ label: `${s.name}, ${periodLabel(s, p)}`, amount: s.price }];
      if (opts.athleteFee) lines.push({ label: "Athlete app and movement scans", amount: opts.athleteFee });
      fresh.push({
        id: `inv_${period}`,
        number: 0,
        client_id: s.client_id,
        subscription_id: s.id,
        period,
        lines,
        total: round2(lines.reduce((t, l) => t + l.amount, 0)),
        issued: p,
        due: addDays(p, DUE_DAYS),
        status: "open",
        paid_at: null,
        method: null,
        sent_at: null,
      });
    }
  }
  fresh.sort((a, b) => a.issued.localeCompare(b.issued));
  for (const f of fresh) f.number = ++number;
  return fresh;
}

export function oneOffInvoice(existing: Invoice[], client_id: string, label: string, amount: number, issued: string, due: string): Invoice {
  const number = existing.reduce((m, i) => Math.max(m, i.number), 0) + 1;
  return { id: `inv_${number}_${Math.random().toString(36).slice(2, 8)}`, number, client_id, subscription_id: null, period: null, lines: [{ label, amount }], total: round2(amount), issued, due, status: "open", paid_at: null, method: null, sent_at: null };
}

export function billingSummary(subs: Subscription[], invoices: Invoice[], today: string) {
  const month = today.slice(0, 7);
  const open = invoices.filter((i) => i.status === "open");
  const overdue = open.filter((i) => i.due < today);
  return {
    mrr: mrr(subs),
    members: subs.filter((s) => s.status === "active").length,
    collected: round2(invoices.filter((i) => i.status === "paid" && i.paid_at?.slice(0, 7) === month).reduce((t, i) => t + i.total, 0)),
    outstanding: round2(open.reduce((t, i) => t + i.total, 0)),
    overdue: round2(overdue.reduce((t, i) => t + i.total, 0)),
    overdueCount: overdue.length,
    openCount: open.length,
  };
}
