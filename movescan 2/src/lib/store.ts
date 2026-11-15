"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreScan } from "./scoring";
import { CARSON_FAILS, RALEIGH_FAILS } from "./seed";
import { addDays, DEFAULT_SETTINGS, RETEST_DAYS, type Client, type GymSettings, type NewClient, type NewScan, type Scan } from "./types";

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

// ---------- demo backend ----------
const KEY = "movescan-demo-v4";
type DemoData = { clients: Client[]; scans: Scan[]; settings: GymSettings };

// Deterministic demo roster with scan histories that improve, so dashboards and progress charts
// look the way they will after a few months of real use.
function seed(): DemoData {
  const now = Date.now();
  const iso = (daysAgo: number) => new Date(now - daysAgo * 864e5).toISOString();
  let r = 7;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const blank = { email: null, phone: null, injuries: null, goals: null, guardian_name: null, guardian_email: null, guardian_phone: null, consent: true };
  const roster: [string, string, string, string | null, string[], number[]][] = [
    // first, last, sport, dob, baseline fails, days-ago of each scan (oldest first)
    ["Mason", "Reed", "Hockey, defense", "2008-05-01", RALEIGH_FAILS, [185, 95]],
    ["Avery", "Cole", "Hockey, forward", "2009-09-12", CARSON_FAILS, [130, 40, 2]],
    ["Jordan", "Price", "Soccer, midfield", "2007-02-18", CARSON_FAILS.slice(4), [200, 110, 10]],
    ["Elena", "Ruiz", "Volleyball", "2006-11-03", RALEIGH_FAILS.slice(6), [96, 5]],
    ["Marcus", "Bell", "Football, linebacker", "2006-07-22", [...RALEIGH_FAILS.slice(0, 10), ...CARSON_FAILS.slice(10)], [160, 70]],
    ["Priya", "Shah", "Tennis", "1994-03-09", CARSON_FAILS.slice(8, 20), [12]],
    ["Tyler", "Grant", "Baseball, pitcher", "2008-01-30", RALEIGH_FAILS.slice(2, 22), [92]],
    ["Nora", "Walsh", "Distance running", "1989-08-15", RALEIGH_FAILS.slice(12), [150, 55, 8]],
    ["Caleb", "Ortiz", "Lacrosse, attack", "2007-06-11", CARSON_FAILS.slice(2, 18), [9]],
    ["Sofia", "Bennett", "Gymnastics", "2010-01-25", RALEIGH_FAILS.slice(16), [120, 4]],
    ["Liam", "Foster", "Hockey, goalie", "2008-10-02", RALEIGH_FAILS.slice(4, 20), [11]],
    ["Grace", "Kim", "Swimming", "2005-04-17", CARSON_FAILS.slice(12), [30]],
    ["Owen", "Hart", "Basketball, guard", "2007-12-08", [...CARSON_FAILS.slice(0, 8), ...RALEIGH_FAILS.slice(18)], [1]],
  ];
  const clients: Client[] = [];
  const scans: Scan[] = [];
  roster.forEach(([first, last, sport, dob, base, when], ci) => {
    const id = `demo-${first.toLowerCase()}`;
    const minor = dob !== null && new Date(dob).getTime() > now - 18 * 365.25 * 864e5;
    clients.push({
      ...blank,
      id, first_name: first, last_name: last, sport, dob,
      height_in: 64 + Math.round(rand() * 12), weight_lb: 120 + Math.round(rand() * 90),
      email: minor ? null : `${first.toLowerCase()}@example.com`,
      guardian_name: minor ? `${last} family` : null,
      guardian_email: minor ? `${last.toLowerCase()}.family@example.com` : null,
      goals: ci % 2 ? "Stay healthy through the season" : "Move better, add power",
      created_at: iso(when[0]),
    });
    let fails = [...base];
    when.forEach((ago, si) => {
      if (si > 0) fails = fails.filter(() => rand() > 0.38); // each retest clears roughly a third
      const sid = `${id}-${si}`;
      scans.push({
        id: sid, client_id: id, fails: [...fails], skipped: [], notes: {},
        performed_at: iso(ago),
        total_pct: Number(scoreScan({ fails }).total.pct!.toFixed(2)),
        retest_due: addDays(iso(ago), RETEST_DAYS),
        report_sent_at: iso(ago),
      });
    });
  });
  return {
    clients,
    scans,
    settings: {
      ...DEFAULT_SETTINGS,
      gymName: "Ambrose Performance",
      ownerName: "Ambrose",
      team: [{ name: "Ambrose", email: "ambrose@example.com", role: "Owner" }],
    },
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
    const client: Client = { ...(existing ?? { created_at: new Date().toISOString() }), ...input, id: input.id ?? uid() } as Client;
    d.clients = [...d.clients.filter((c) => c.id !== client.id), client];
    save(d);
    return client;
  },
  async listScans(clientId) {
    return load().scans.filter((s) => !clientId || s.client_id === clientId).sort(byNewest);
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
  async getSettings() {
    return { ...DEFAULT_SETTINGS, ...load().settings };
  },
  async saveSettings(patch) {
    const d = load();
    d.settings = { ...DEFAULT_SETTINGS, ...d.settings, ...patch };
    save(d);
    return d.settings;
  },
  async markReportSent(id) {
    const d = load();
    const s = d.scans.find((x) => x.id === id);
    if (s) s.report_sent_at = new Date().toISOString();
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
};

export const store: Store = isLive ? liveStore : demoStore;

export function resetDemo() {
  if (!isLive) {
    save(seed());
  }
}
