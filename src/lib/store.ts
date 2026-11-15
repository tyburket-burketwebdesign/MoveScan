"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateInvoices, type Invoice, type MembershipPlan, type Subscription } from "./billing";
import { ATHLETE_TIERS } from "./plans";
import { scoreScan } from "./scoring";
import { CARSON_FAILS, RALEIGH_FAILS } from "./seed";
import { allSessions, blankLog, fromTemplate, sessionsFor, type Assignment, type LibraryExercise, type Program, type WorkoutLog } from "./training";
import { addDays, DEFAULT_SETTINGS, mondayOf, RETEST_DAYS, todayISO, weekdayOf, type Client, type GymSettings, type NewClient, type NewScan, type Scan } from "./types";

// Everything beyond athletes and scans is stored as typed records of one of these kinds.
export type KindMap = {
  exercise: LibraryExercise;
  program: Program;
  assignment: Assignment;
  log: WorkoutLog;
  plan: MembershipPlan;
  subscription: Subscription;
  invoice: Invoice;
};
export type Kind = keyof KindMap;

// One interface, two backends. With Supabase env vars set, data lives in Postgres behind logins.
// Without them the app runs in demo mode on browser storage, so it can be clicked through anywhere.
export interface Store {
  mode: "demo" | "live";
  listClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | null>;
  saveClient(c: NewClient & { id?: string }): Promise<Client>;
  listScans(clientId?: string): Promise<Scan[]>; // newest first
  getScan(id: string): Promise<Scan | null>;
  createScan(s: NewScan): Promise<Scan>;
  markReportSent(id: string): Promise<void>;
  getSettings(): Promise<GymSettings>;
  saveSettings(patch: Partial<GymSettings>): Promise<GymSettings>;
  list<K extends Kind>(kind: K, clientId?: string): Promise<KindMap[K][]>;
  get<K extends Kind>(kind: K, id: string): Promise<KindMap[K] | null>;
  put<K extends Kind>(kind: K, row: KindMap[K]): Promise<KindMap[K]>;
  remove(kind: Kind, id: string): Promise<void>;
}

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isLive = Boolean(SUPABASE_URL && SUPABASE_ANON);

let _sb: SupabaseClient | null = null;
export function supabase() {
  if (!_sb) _sb = createBrowserClient(SUPABASE_URL!, SUPABASE_ANON!);
  return _sb;
}

const uid = () => crypto.randomUUID();
const byNewest = (a: Scan, b: Scan) => b.performed_at.localeCompare(a.performed_at);
const clientIdOf = (row: unknown) => (row as { client_id?: string }).client_id ?? null;

// ---------- demo backend ----------
const KEY = "tungsten-demo-v2";
export type DemoData = { clients: Client[]; scans: Scan[]; settings: GymSettings; records: { [K in Kind]: KindMap[K][] } };

// A deterministic gym a few months into using the product: athletes with improving scans,
// programs in progress with realistic adherence, memberships, and a billing history.
function seed(): DemoData {
  const now = Date.now();
  const today = todayISO();
  const iso = (daysAgo: number) => new Date(now - daysAgo * 864e5).toISOString();
  let r = 7;
  const rand = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const blank = { email: null, phone: null, injuries: null, goals: null, guardian_name: null, guardian_email: null, guardian_phone: null, consent: true, archived: false };

  const plans: MembershipPlan[] = [
    { id: "plan-2x", name: "2 sessions a week", price: 280, interval: "month", description: "Two coached sessions every week.", active: true },
    { id: "plan-3x", name: "3 sessions a week", price: 390, interval: "month", description: "Three coached sessions every week.", active: true },
    { id: "plan-4x", name: "4 sessions a week", price: 480, interval: "month", description: "Four coached sessions every week.", active: true },
    { id: "plan-remote", name: "Remote programming", price: 129, interval: "month", description: "Programming and check-ins through the app.", active: true },
    { id: "plan-scan", name: "Movement scan", price: 75, interval: "once", description: "A single scan with report and corrective program.", active: true },
  ];

  const programs: Program[] = ["foundation", "inseason", "speed"].map((k) => ({ ...fromTemplate(k), id: `prog-${k}`, created_at: iso(120) }));
  // Stable ids so demo links keep working after a reset.
  programs.forEach((p) => p.days.forEach((d, di) => ((d.id = `${p.id}-d${di}`), d.items.forEach((it, ii) => (it.id = `${d.id}-i${ii}`)))));

  // The demo always has someone training today: if no Speed and Power day lands on today, move its last day here.
  const speed = programs[2];
  if (!speed.days.some((d) => d.weekday === weekdayOf(today))) speed.days[speed.days.length - 1].weekday = weekdayOf(today);

  // first, last, sport, dob, baseline fails, scan days-ago (oldest first), membership, program, weeks in, adherence
  type Row = [string, string, string, string, string[], number[], string | null, number | null, number, number];
  const roster: Row[] = [
    ["Mason", "Reed", "Hockey, defense", "2008-05-01", RALEIGH_FAILS, [185, 95], "plan-3x", 0, 4, 0.9],
    ["Avery", "Cole", "Hockey, forward", "2009-09-12", CARSON_FAILS, [130, 40, 2], "plan-3x", 1, 3, 0.95],
    ["Jordan", "Price", "Soccer, midfield", "2007-02-18", CARSON_FAILS.slice(4), [200, 110, 10], "plan-2x", 2, 4, 0.8],
    ["Elena", "Ruiz", "Volleyball", "2006-11-03", RALEIGH_FAILS.slice(6), [96, 5], "plan-3x", 0, 5, 0.85],
    ["Marcus", "Bell", "Football, linebacker", "2006-07-22", [...RALEIGH_FAILS.slice(0, 10), ...CARSON_FAILS.slice(10)], [160, 70], "plan-4x", 0, 3, 0.75],
    ["Priya", "Shah", "Tennis", "1994-03-09", CARSON_FAILS.slice(8, 20), [12], "plan-remote", 2, 1, 0.9],
    ["Tyler", "Grant", "Baseball, pitcher", "2008-01-30", RALEIGH_FAILS.slice(2, 22), [92], "plan-2x", 1, 4, 1],
    ["Nora", "Walsh", "Distance running", "1989-08-15", RALEIGH_FAILS.slice(12), [150, 55, 8], "plan-remote", 2, 5, 0.92],
    ["Caleb", "Ortiz", "Lacrosse, attack", "2007-06-11", CARSON_FAILS.slice(2, 18), [9], "plan-3x", 0, 1, 1],
    ["Sofia", "Bennett", "Gymnastics", "2010-01-25", RALEIGH_FAILS.slice(16), [120, 4], "plan-2x", 1, 4, 0.88],
    ["Liam", "Foster", "Hockey, goalie", "2008-10-02", RALEIGH_FAILS.slice(4, 20), [11], "plan-2x", 1, 1, 0.8],
    ["Grace", "Kim", "Swimming", "2005-04-17", CARSON_FAILS.slice(12), [30], "plan-4x", 0, 4, 0.82],
    ["Owen", "Hart", "Basketball, guard", "2007-12-08", [...CARSON_FAILS.slice(0, 8), ...RALEIGH_FAILS.slice(18)], [1], null, null, 0, 0],
  ];

  const clients: Client[] = [];
  const scans: Scan[] = [];
  const assignments: Assignment[] = [];
  const logs: WorkoutLog[] = [];
  const subs: Subscription[] = [];

  roster.forEach(([first, last, sport, dob, base, when, planId, progIdx, weeksIn, adherence], ci) => {
    const id = `demo-${first.toLowerCase()}`;
    const minor = new Date(dob).getTime() > now - 18 * 365.25 * 864e5;
    clients.push({
      ...blank,
      id,
      portal_token: id,
      first_name: first,
      last_name: last,
      sport,
      dob,
      height_in: 64 + Math.round(rand() * 12),
      weight_lb: 120 + Math.round(rand() * 90),
      email: minor ? null : `${first.toLowerCase()}@example.com`,
      guardian_name: minor ? `${last} family` : null,
      guardian_email: minor ? `${last.toLowerCase()}.family@example.com` : null,
      goals: ci % 2 ? "Stay healthy through the season" : "Move better, add power",
      created_at: iso(when[0]),
    });

    let fails = [...base];
    when.forEach((ago, si) => {
      if (si > 0) fails = fails.filter(() => rand() > 0.38); // each retest clears roughly a third
      scans.push({
        id: `${id}-${si}`,
        client_id: id,
        fails: [...fails],
        skipped: [],
        notes: {},
        performed_at: iso(ago),
        total_pct: Number(scoreScan({ fails }).total.pct!.toFixed(2)),
        retest_due: addDays(iso(ago), RETEST_DAYS),
        report_sent_at: iso(ago),
      });
    });

    if (progIdx !== null) {
      const program = programs[progIdx];
      const a: Assignment = { id: `asg-${id}`, client_id: id, program_id: program.id, program, start: addDays(mondayOf(today), -7 * (weeksIn - 1)), weeks: program.weeks, status: "active", created_at: iso(weeksIn * 7) };
      assignments.push(a);
      const due = sessionsFor(a).filter((s) => s.date <= today);
      due.forEach((s, i) => {
        // Tyler has gone quiet: his last two sessions are missed, which the dashboard should surface.
        // Nora's session today is left open so the athlete app demo has something to start.
        const skip = (first === "Tyler" && i >= due.length - 2) || (first === "Nora" && s.date === today);
        const done = !skip && rand() < (s.date === today ? adherence * 0.5 : adherence);
        if (!done) return;
        logs.push({
          ...blankLog(s),
          done: Object.fromEntries(s.day.items.map((it) => [it.id, it.sets])),
          completed_at: `${s.date}T17:30:00`,
          rpe: 6 + Math.floor(rand() * 4),
          note: "",
        });
      });
    }

    if (planId) {
      const plan = plans.find((p) => p.id === planId)!;
      // Marcus is two weeks into an unpaid period (overdue); Grace was billed two days ago (open).
      const startAgo = first === "Marcus" ? 73 : first === "Grace" ? 32 : 35 + Math.floor(rand() * 110);
      subs.push({ id: `sub-${id}`, client_id: id, plan_id: plan.id, name: plan.name, price: plan.price, interval: "month", start: addDays(today, -startAgo), status: "active", resume_from: null });
    }
  });

  const invoices: Invoice[] = generateInvoices(subs, [], today).map((inv): Invoice => {
    const sub = subs.find((s) => s.id === inv.subscription_id)!;
    const latest = !generateInvoices([sub], [], today).some((x) => x.issued > inv.issued);
    const unpaid = latest && (sub.client_id === "demo-marcus" || sub.client_id === "demo-grace");
    return unpaid ? { ...inv, sent_at: inv.issued } : { ...inv, status: "paid", paid_at: addDays(inv.issued, Math.floor(rand() * 3)), method: rand() < 0.85 ? "card" : "cash", sent_at: inv.issued };
  });
  // Owen came in for a one-time scan yesterday.
  invoices.push({ id: "inv_owen_scan", number: invoices.length + 1, client_id: "demo-owen", subscription_id: null, period: null, lines: [{ label: "Movement scan", amount: 75 }], total: 75, issued: addDays(today, -1), due: addDays(today, 4), status: "paid", paid_at: addDays(today, -1), method: "cash", sent_at: null });

  return {
    clients,
    scans,
    settings: {
      ...DEFAULT_SETTINGS,
      gymName: "Ambrose Performance",
      ownerName: "Ambrose",
      plan: "core",
      planStartedAt: iso(9),
      payoutsConnected: true,
      team: [{ name: "Ambrose", email: "ambrose@example.com", role: "Owner" }],
    },
    records: { exercise: [], program: programs, assignment: assignments, log: logs, plan: plans, subscription: subs, invoice: invoices },
  };
}

function load(): DemoData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const d = seed();
  save(d);
  return d;
}
function save(d: DemoData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {}
}

const demoStore: Store = {
  mode: "demo",
  async listClients() {
    return load().clients.sort((a, b) => a.first_name.localeCompare(b.first_name));
  },
  async getClient(id) {
    return load().clients.find((c) => c.id === id) ?? null;
  },
  async saveClient(input) {
    const d = load();
    const existing = input.id ? d.clients.find((c) => c.id === input.id) : undefined;
    const client: Client = { created_at: new Date().toISOString(), portal_token: uid(), archived: false, ...existing, ...input, id: input.id ?? uid() };
    d.clients = [...d.clients.filter((c) => c.id !== client.id), client];
    save(d);
    return client;
  },
  async listScans(clientId) {
    return load()
      .scans.filter((s) => !clientId || s.client_id === clientId)
      .sort(byNewest);
  },
  async getScan(id) {
    return load().scans.find((s) => s.id === id) ?? null;
  },
  async createScan(input) {
    const d = load();
    const scan: Scan = { ...input, id: uid(), report_sent_at: null };
    d.scans.push(scan);
    save(d);
    return scan;
  },
  async markReportSent(id) {
    const d = load();
    const s = d.scans.find((x) => x.id === id);
    if (s) s.report_sent_at = new Date().toISOString();
    save(d);
  },
  async getSettings() {
    return { ...DEFAULT_SETTINGS, ...load().settings };
  },
  async saveSettings(patch) {
    const d = load();
    d.settings = { ...DEFAULT_SETTINGS, ...d.settings, ...patch };
    save(d);
    return d.settings;
  },
  async list(kind, clientId) {
    const rows = load().records[kind] ?? [];
    return clientId ? rows.filter((x) => clientIdOf(x) === clientId) : rows;
  },
  async get(kind, id) {
    return (load().records[kind] ?? []).find((x) => x.id === id) ?? null;
  },
  async put(kind, row) {
    const d = load();
    const rows = (d.records[kind] ?? []) as { id: string }[];
    const i = rows.findIndex((x) => x.id === row.id);
    if (i >= 0) rows[i] = row;
    else rows.push(row);
    (d.records as Record<string, unknown>)[kind] = rows;
    save(d);
    return row;
  },
  async remove(kind, id) {
    const d = load();
    (d.records as Record<string, unknown>)[kind] = (d.records[kind] as { id: string }[]).filter((x) => x.id !== id);
    save(d);
  },
};

// ---------- live backend (Supabase) ----------
// Row level security in supabase/migrations walls each gym's data off; gym_id is filled in by a
// database default from the signed-in user's membership, so the client never chooses it.
function must<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}

const liveStore: Store = {
  mode: "live",
  async listClients() {
    return must(await supabase().from("clients").select("*").order("first_name")) as Client[];
  },
  async getClient(id) {
    return must(await supabase().from("clients").select("*").eq("id", id).maybeSingle()) as Client | null;
  },
  async saveClient(input) {
    return must(await supabase().from("clients").upsert(input).select().single()) as Client;
  },
  async listScans(clientId) {
    let q = supabase().from("scans").select("*").order("performed_at", { ascending: false });
    if (clientId) q = q.eq("client_id", clientId);
    return must(await q) as Scan[];
  },
  async getScan(id) {
    return must(await supabase().from("scans").select("*").eq("id", id).maybeSingle()) as Scan | null;
  },
  async createScan(input) {
    return must(await supabase().from("scans").insert(input).select().single()) as Scan;
  },
  async markReportSent(id) {
    must(await supabase().from("scans").update({ report_sent_at: new Date().toISOString() }).eq("id", id));
  },
  async getSettings() {
    const g = must(await supabase().from("gyms").select("name, settings").limit(1).maybeSingle()) as { name: string; settings: Partial<GymSettings> } | null;
    return { ...DEFAULT_SETTINGS, gymName: g?.name ?? DEFAULT_SETTINGS.gymName, ...(g?.settings ?? {}) };
  },
  async saveSettings(patch) {
    const current = await this.getSettings();
    const next = { ...current, ...patch };
    const { gymName, ...rest } = next;
    const gym = must(await supabase().from("gyms").select("id").limit(1).single()) as { id: string };
    must(await supabase().from("gyms").update({ name: gymName, settings: rest }).eq("id", gym.id));
    return next;
  },
  async list(kind, clientId) {
    let q = supabase().from("records").select("data").eq("kind", kind);
    if (clientId) q = q.eq("client_id", clientId);
    return (must(await q) as { data: never }[]).map((x) => x.data);
  },
  async get(kind, id) {
    const row = must(await supabase().from("records").select("data").eq("kind", kind).eq("id", id).maybeSingle()) as { data: never } | null;
    return row?.data ?? null;
  },
  async put(kind, row) {
    must(await supabase().from("records").upsert({ id: row.id, kind, client_id: clientIdOf(row), data: row }));
    return row;
  },
  async remove(kind, id) {
    must(await supabase().from("records").delete().eq("kind", kind).eq("id", id));
  },
};

export const store: Store = isLive ? liveStore : demoStore;

export function resetDemo() {
  if (!isLive) save(seed());
}

// Bring invoices up to date: every active membership gets its invoice for each period that has started.
export async function syncBilling() {
  const [subs, invoices, settings] = await Promise.all([store.list("subscription"), store.list("invoice"), store.getSettings()]);
  const fresh = generateInvoices(subs, invoices, todayISO(), { athleteFee: settings.passAthleteFee ? ATHLETE_TIERS[0].rate : 0 });
  for (const inv of fresh) await store.put("invoice", inv);
  return [...invoices, ...fresh];
}

// Everything the trainer's overview screens need, in one call.
export async function loadGym() {
  const [clients, scans, settings, assignments, logs, subs, invoices] = await Promise.all([
    store.listClients(),
    store.listScans(),
    store.getSettings(),
    store.list("assignment"),
    store.list("log"),
    store.list("subscription"),
    syncBilling(),
  ]);
  return { clients: clients.filter((c) => !c.archived), scans, settings, assignments, logs, subs, invoices, sessions: allSessions(assignments.filter((a) => a.status === "active")) };
}
export type Gym = Awaited<ReturnType<typeof loadGym>>;
