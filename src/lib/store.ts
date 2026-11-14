"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreScan } from "./scoring";
import { CARSON_FAILS, RALEIGH_FAILS } from "./seed";
import { addDays, RETEST_DAYS, type Client, type NewClient, type NewScan, type Scan } from "./types";

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
const KEY = "movescan-demo-v2";
type DemoData = { clients: Client[]; scans: Scan[] };

function seed(): DemoData {
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 864e5).toISOString();
  const blank = { email: null, phone: null, height_in: null, weight_lb: null, injuries: null, goals: null, guardian_name: null, guardian_email: null, guardian_phone: null, consent: true };
  const clients: Client[] = [
    { ...blank, id: "demo-raleigh", first_name: "Raleigh", last_name: "(demo)", dob: "2008-05-01", sport: "Hockey", created_at: daysAgo(95) },
    { ...blank, id: "demo-carson", first_name: "Carson", last_name: "(demo)", dob: "2009-09-12", sport: "Hockey", guardian_name: "Carson's parent (demo)", guardian_email: "parent@example.com", created_at: daysAgo(40) },
  ];
  const mk = (id: string, client_id: string, fails: string[], ago: number): Scan => ({
    id, client_id, fails, skipped: [], notes: {},
    performed_at: daysAgo(ago),
    total_pct: scoreScan({ fails }).total.pct!,
    retest_due: addDays(daysAgo(ago), RETEST_DAYS),
    report_sent_at: daysAgo(ago),
  });
  return {
    clients,
    scans: [mk("demo-scan-raleigh", "demo-raleigh", RALEIGH_FAILS, 95), mk("demo-scan-carson", "demo-carson", CARSON_FAILS, 40)],
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
};

export const store: Store = isLive ? liveStore : demoStore;

export function resetDemo() {
  if (!isLive) {
    save(seed());
  }
}
