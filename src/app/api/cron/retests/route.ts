import { NextResponse } from "next/server";
import { admin, BOOKING_URL, emailShell, esc, sendEmail } from "@/lib/server";
import { generateInvoices, type Invoice, type Subscription } from "@/lib/billing";
import { ATHLETE_TIERS } from "@/lib/plans";
import { addDays, contactFor, todayISO, type Client, type GymSettings, type Scan } from "@/lib/types";

// Runs every morning (see vercel.json). First it brings membership invoices up to date for every gym.
// Then it finds each client whose LATEST scan has a retest due within
// 7 days (or already past due) and who hasn't been reminded yet, then emails them once.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = admin();
  if (!db) return NextResponse.json({ skipped: "database not connected" });

  // 1. Billing: each active membership gets its invoice for every period that has started.
  let invoiced = 0;
  const [{ data: gyms }, { data: recs }] = await Promise.all([db.from("gyms").select("id, settings"), db.from("records").select("gym_id, kind, data").in("kind", ["subscription", "invoice"])]);
  for (const gym of (gyms ?? []) as { id: string; settings: Partial<GymSettings> }[]) {
    const mine = (recs ?? []).filter((r) => r.gym_id === gym.id);
    const fresh = generateInvoices(
      mine.filter((r) => r.kind === "subscription").map((r) => r.data as Subscription),
      mine.filter((r) => r.kind === "invoice").map((r) => r.data as Invoice),
      todayISO(),
      { athleteFee: gym.settings?.passAthleteFee ? ATHLETE_TIERS[0].rate : 0 },
    );
    if (fresh.length) await db.from("records").upsert(fresh.map((inv) => ({ id: inv.id, gym_id: gym.id, kind: "invoice", client_id: inv.client_id, data: inv })), { onConflict: "id", ignoreDuplicates: true });
    invoiced += fresh.length;
  }

  // 2. Retest reminders.
  const { data: scans, error } = await db
    .from("scans")
    .select("*, clients(*), gyms(name)")
    .lte("retest_due", addDays(todayISO(), 7))
    .is("reminder_sent_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { scan: string; sent: string[]; error?: string }[] = [];
  for (const row of scans as (Scan & { clients: Client; gyms: { name: string } | null })[]) {
    // Skip if the client has been scanned again since (that newer scan carries the retest date now).
    const { count } = await db.from("scans").select("id", { count: "exact", head: true }).eq("client_id", row.client_id).gt("performed_at", row.performed_at);
    if (count) {
      await db.from("scans").update({ reminder_sent_at: new Date().toISOString() }).eq("id", row.id);
      continue;
    }

    const client = row.clients;
    if (!client?.consent) continue;
    const contact = contactFor(client);
    const due = new Date(row.retest_due + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const sent: string[] = [];
    try {
      if (contact.email) {
        await sendEmail(
          contact.email,
          `Time for ${client.first_name}'s retest`,
          emailShell(`
          <h1 style="margin:0 0 8px;font-size:22px">Hi ${esc(contact.name)},</h1>
          <p style="color:#9aa1a9">It's been about three months since ${esc(client.first_name)}'s last movement scan
          (score <b style="color:#eceef0">${Math.round(Number(row.total_pct))}%</b>). The retest is due ${due}. Let's see the progress.</p>
          ${
            BOOKING_URL
              ? `<div style="text-align:center;margin:24px 0"><a href="${esc(BOOKING_URL)}" style="background:#f5f6f7;color:#121417;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:700">Book the retest</a></div>`
              : `<p style="color:#9aa1a9">Reply to this email to set up a time.</p>`
          }`, row.gyms?.name),
        );
        sent.push("email");
      }
      if (sent.length) await db.from("scans").update({ reminder_sent_at: new Date().toISOString() }).eq("id", row.id);
      results.push({ scan: row.id, sent });
    } catch (e) {
      results.push({ scan: row.id, sent, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({ invoiced, checked: scans.length, results });
}
