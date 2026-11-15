"use client";

// The athlete app's data access. In demo mode it reads the same browser storage as the trainer side;
// live, it goes through /api/portal with the athlete's private token (athletes have no login yet).
import type { Invoice, Subscription } from "./billing";
import { isLive, store } from "./store";
import { allSessions, indexLogs, isDone, type Assignment, type LibraryExercise, type WorkoutLog } from "./training";
import { todayISO, type Client, type Scan } from "./types";

export interface PortalBundle {
  athlete: Pick<Client, "id" | "first_name" | "last_name" | "sport">;
  gym: { name: string; payoutsConnected: boolean; accent: string | null; mapping: Record<string, string[]> | null };
  scans: Scan[]; // newest first
  assignments: Assignment[];
  logs: WorkoutLog[];
  subscription: Subscription | null;
  invoices: Invoice[];
  exercises: LibraryExercise[]; // the gym's own exercises and video overrides
}

export async function loadPortal(token: string): Promise<PortalBundle | null> {
  if (isLive) {
    const res = await fetch(`/api/portal?token=${encodeURIComponent(token)}`, { cache: "no-store" });
    return res.ok ? res.json() : null;
  }
  const clients = await store.listClients();
  let c = clients.find((x) => x.portal_token === token);
  if (!c && token === "demo") {
    // The demo link opens whichever athlete has a session waiting today.
    const [assignments, logs] = await Promise.all([store.list("assignment"), store.list("log")]);
    const done = indexLogs(logs);
    const waiting = allSessions(assignments.filter((a) => a.status === "active")).find((s) => s.date === todayISO() && !isDone(s, done));
    c = clients.find((x) => x.id === waiting?.assignment.client_id) ?? clients[0];
  }
  if (!c) return null;
  const [settings, scans, assignments, logs, subs, invoices, exercises] = await Promise.all([
    store.getSettings(),
    store.listScans(c.id),
    store.list("assignment", c.id),
    store.list("log", c.id),
    store.list("subscription", c.id),
    store.list("invoice", c.id),
    store.list("exercise"),
  ]);
  return {
    athlete: { id: c.id, first_name: c.first_name, last_name: c.last_name, sport: c.sport },
    gym: { name: settings.gymName, payoutsConnected: settings.payoutsConnected, accent: settings.accent, mapping: settings.mapping },
    scans,
    assignments: assignments.filter((a) => a.status === "active"),
    logs,
    subscription: subs.find((s) => s.status !== "canceled") ?? null,
    invoices: invoices.filter((i) => i.status !== "void"),
    exercises,
  };
}

async function post(token: string, body: object) {
  const res = await fetch(`/api/portal?token=${encodeURIComponent(token)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "That didn't save. Check your connection and try again.");
}

export async function saveLog(token: string, log: WorkoutLog) {
  if (isLive) return post(token, { action: "log", log });
  await store.put("log", log);
}

// Card charging is not connected yet, so paying from the athlete app records the invoice as paid.
export async function payInvoice(token: string, invoice: Invoice): Promise<Invoice> {
  const paid: Invoice = { ...invoice, status: "paid", paid_at: todayISO(), method: "card" };
  if (isLive) await post(token, { action: "pay", invoiceId: invoice.id });
  else await store.put("invoice", paid);
  return paid;
}
