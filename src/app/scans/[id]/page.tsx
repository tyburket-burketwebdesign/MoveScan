"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AppShell, { Loading } from "@/components/AppShell";
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

  if (scan === undefined || (scan && !client)) return scan === null ? null : <Loading />;
  if (scan === null)
    return (
      <div className="surface p-8">
        <p className="wide text-xl font-bold">This scan isn&apos;t here</p>
        <p className="mt-2 text-dim">The link may be wrong, or it was saved on another device.</p>
        <Link href="/" className="btn btn-quiet mt-5">Go to today</Link>
      </div>
    );
  if (!client) return null;

  const link = `${location.origin}/r/${scan.id}`;
  const contact = contactFor(client);

  async function sendReport() {
    if (!scan || !client) return;
    if (!contact.email && !contact.phone) return setStatus("There's no email or phone on file. Add one on the next retest to send reports.");
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
      setStatus(`Report sent by ${body.sent.join(" and ")}.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {justSaved && (
        <div className="no-print flex items-center gap-3 rounded-2xl bg-ice/10 px-5 py-4 text-ice">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
          Scan saved. Retest set for {new Date(scan.retest_due + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric" })}.
        </div>
      )}
      {status && (
        <p className="no-print rounded-2xl bg-raised px-5 py-4" role="status">
          {status}
        </p>
      )}
      <ResultsView
        scan={scan}
        name={fullName(client)}
        previous={previous}
        actions={
          <>
            <button className="btn btn-primary" disabled={sending} onClick={sendReport}>
              {sending ? "Sending…" : scan.report_sent_at ? "Send report again" : "Send report"}
            </button>
            <button
              className="btn btn-quiet"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setStatus("Report link copied.");
              }}
            >
              Copy link
            </button>
            <button className="btn btn-quiet" onClick={() => window.print()}>
              Save PDF
            </button>
            <Link className="btn btn-quiet" href={`/clients/${client.id}`}>
              Profile
            </Link>
          </>
        }
      />
      {!isLive && <p className="no-print text-center text-sm text-faint">In demo mode, report links only open on this device.</p>}
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <ScanPage />
      </Suspense>
    </AppShell>
  );
}
