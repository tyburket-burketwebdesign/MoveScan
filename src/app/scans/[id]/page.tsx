"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ResultsView from "@/components/ResultsView";
import { scoreScan } from "@/lib/scoring";
import { isLive, store, supabase } from "@/lib/store";
import { contactFor, fullName, type Client, type Scan } from "@/lib/types";

function ScanPage() {
  const { id } = useParams<{ id: string }>();
  const justSaved = useSearchParams().get("new") === "1";
  const [scan, setScan] = useState<Scan | null | undefined>(undefined);
  const [client, setClient] = useState<Client | null>(null);
  const [previous, setPrevious] = useState<Scan | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await store.getScan(id);
      setScan(s);
      if (!s) return;
      const [c, history] = await Promise.all([store.getClient(s.client_id), store.listScans(s.client_id)]);
      setClient(c);
      setPrevious(history.find((h) => h.performed_at < s.performed_at) ?? null);
    })();
  }, [id]);

  if (scan === undefined) return <p className="text-dim">Loading…</p>;
  if (scan === null || !client) return <p className="text-dim">Scan not found.</p>;

  const link = `${location.origin}/r/${scan.id}`;
  const contact = contactFor(client);

  async function sendReport() {
    if (!scan || !client) return;
    if (!contact.email && !contact.phone) return setStatus("No email or phone on file for this client.");
    setSending(true);
    setStatus(null);
    const s = scoreScan(scan);
    try {
      const token = isLive ? (await supabase().auth.getSession()).data.session?.access_token : undefined;
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          to: contact.email,
          phone: contact.phone,
          name: contact.name,
          clientName: client.first_name,
          link,
          total: s.total.pct,
          movements: s.movements.map((m) => ({ label: m.label, pct: m.score.pct, skipped: m.skipped })),
          retestDue: scan.retest_due,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Send failed");
      await store.markReportSent(scan.id);
      setScan({ ...scan, report_sent_at: new Date().toISOString() });
      setStatus(`Sent: ${body.sent.join(" and ")}.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {justSaved && (
        <div className="no-print rounded-xl border border-good/40 bg-good/10 px-4 py-3 text-sm text-good">
          Scan saved. Retest scheduled for {new Date(scan.retest_due + "T00:00:00").toLocaleDateString()}.
        </div>
      )}
      <ResultsView
        scan={scan}
        name={fullName(client)}
        previous={previous}
        actions={
          <>
            <button className="btn btn-primary" disabled={sending} onClick={sendReport}>
              {sending ? "Sending…" : scan.report_sent_at ? "Resend report" : `Send to ${contact.name}`}
            </button>
            <button
              className="btn btn-ghost"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setStatus("Report link copied.");
              }}
            >
              Copy link
            </button>
            <button className="btn btn-ghost" onClick={() => window.print()}>
              PDF
            </button>
            <Link className="btn btn-ghost" href={`/clients/${client.id}`}>
              Profile
            </Link>
          </>
        }
      />
      {status && <p className="no-print text-center text-sm text-accent">{status}</p>}
      {!isLive && (
        <p className="no-print text-center text-xs text-faint">In demo mode the report link only opens on this device.</p>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<p className="text-dim">Loading…</p>}>
        <ScanPage />
      </Suspense>
    </AppShell>
  );
}
