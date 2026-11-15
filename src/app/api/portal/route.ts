import { NextResponse } from "next/server";
import type { Invoice, Subscription } from "@/lib/billing";
import type { PortalBundle } from "@/lib/portal";
import { admin } from "@/lib/server";
import type { Assignment, WorkoutLog } from "@/lib/training";
import { todayISO, type Client, type GymSettings, type Scan } from "@/lib/types";

// The athlete app's backend in live mode. Athletes have no login yet: their private link carries an
// unguessable token, and every read and write here is limited to that one athlete's rows.
async function athlete(req: Request) {
  const db = admin();
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!db || !/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data } = await db.from("clients").select("*, gyms(name, settings)").eq("portal_token", token).eq("archived", false).maybeSingle();
  return data ? { db, client: data as Client & { gym_id: string; gyms: { name: string; settings: Partial<GymSettings> } } } : null;
}

export async function GET(req: Request) {
  const a = await athlete(req);
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { db, client } = a;
  const [{ data: scans }, { data: mine }, { data: exercises }] = await Promise.all([
    db.from("scans").select("*").eq("client_id", client.id).order("performed_at", { ascending: false }),
    db.from("records").select("kind, data").eq("client_id", client.id).in("kind", ["assignment", "log", "subscription", "invoice"]),
    db.from("records").select("data").eq("gym_id", client.gym_id).eq("kind", "exercise"),
  ]);
  const of = <T,>(kind: string) => (mine ?? []).filter((r) => r.kind === kind).map((r) => r.data as T);
  const bundle: PortalBundle = {
    athlete: { id: client.id, first_name: client.first_name, last_name: client.last_name, sport: client.sport },
    gym: { name: client.gyms.name, payoutsConnected: Boolean(client.gyms.settings?.payoutsConnected), accent: client.gyms.settings?.accent ?? null, mapping: client.gyms.settings?.mapping ?? null },
    scans: (scans ?? []) as Scan[],
    assignments: of<Assignment>("assignment").filter((x) => x.status === "active"),
    logs: of<WorkoutLog>("log"),
    subscription: of<Subscription>("subscription").find((s) => s.status !== "canceled") ?? null,
    invoices: of<Invoice>("invoice").filter((i) => i.status !== "void"),
    exercises: (exercises ?? []).map((r) => r.data),
  };
  return NextResponse.json(bundle);
}

export async function POST(req: Request) {
  const a = await athlete(req);
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { db, client } = a;
  const body = (await req.json()) as { action: "log"; log: WorkoutLog } | { action: "pay"; invoiceId: string };

  if (body.action === "log") {
    const log = body.log;
    // The log must belong to one of this athlete's own assignments.
    const { data: asg } = await db.from("records").select("id").eq("kind", "assignment").eq("client_id", client.id).eq("id", log.assignment_id).maybeSingle();
    if (!asg || !log.id.startsWith(`${log.assignment_id}:`)) return NextResponse.json({ error: "That session isn't yours to log." }, { status: 403 });
    const { error } = await db.from("records").upsert({ id: log.id, gym_id: client.gym_id, kind: "log", client_id: client.id, data: { ...log, client_id: client.id } });
    if (error) return NextResponse.json({ error: "That didn't save. Try again." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "pay") {
    // Card charging isn't connected yet: this records the invoice as paid without moving money.
    const { data: row } = await db.from("records").select("data").eq("kind", "invoice").eq("client_id", client.id).eq("id", body.invoiceId).maybeSingle();
    const inv = row?.data as Invoice | undefined;
    if (!inv || inv.status !== "open") return NextResponse.json({ error: "That invoice can't be paid." }, { status: 400 });
    const { error } = await db.from("records").update({ data: { ...inv, status: "paid", paid_at: todayISO(), method: "card" } }).eq("kind", "invoice").eq("id", inv.id);
    if (error) return NextResponse.json({ error: "That didn't go through. Try again." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
