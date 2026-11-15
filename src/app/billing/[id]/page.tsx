"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import AppShell, { Loading } from "@/components/AppShell";
import { InvoicePaper, MarkPaidSheet } from "@/components/BillingBits";
import { invoiceNo, money, type Invoice } from "@/lib/billing";
import { processingFee } from "@/lib/plans";
import { isLive, store, supabase } from "@/lib/store";
import { contactFor, fmtDate, fullName } from "@/lib/types";
import { useLoad } from "@/lib/useSettings";

function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [data, reload] = useLoad(async () => {
    const invoice = await store.get("invoice", decodeURIComponent(id));
    if (!invoice) return null;
    const [client, settings] = await Promise.all([store.getClient(invoice.client_id), store.getSettings()]);
    return { invoice, client, settings };
  }, [id]);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (data === undefined) return <Loading />;
  if (data === null)
    return (
      <div className="surface p-10">
        <p className="text-xl font-semibold">This invoice isn&apos;t here</p>
        <Link href="/billing" className="btn btn-quiet mt-6">
          Back to Billing
        </Link>
      </div>
    );
  const { invoice, client, settings } = data;
  const contact = client ? contactFor(client) : null;
  const athlete = client ? fullName(client) : "Former athlete";
  const fee = processingFee(invoice.total);

  async function send() {
    if (!client || !contact?.email) return setStatus("There's no email on file for this athlete. Add one on their profile first.");
    setBusy(true);
    setStatus(null);
    try {
      const token = isLive ? (await supabase().auth.getSession()).data.session?.access_token : undefined;
      const res = await fetch("/api/invoice", {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ to: contact.email, name: contact.name, gym: settings.gymName, number: invoiceNo(invoice.number), total: invoice.total, due: invoice.due, lines: invoice.lines, link: `${location.origin}/a/${client.portal_token}?tab=account` }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "The invoice didn't send.");
      await store.put("invoice", { ...invoice, sent_at: new Date().toISOString() });
      setStatus(`Invoice emailed to ${contact.email}.`);
      reload();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "The invoice didn't send.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="print-solo">
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link href="/billing" className="text-[15px] text-dim hover:text-ink">
          Billing
        </Link>
        <div className="flex flex-wrap gap-2.5">
          {invoice.status === "open" && (
            <>
              <button className="btn btn-text text-sm" onClick={async () => confirm(`Void ${invoiceNo(invoice.number)}? It stays in your records but is no longer owed.`) && (await store.put("invoice", { ...invoice, status: "void" }), reload())}>
                Void
              </button>
              <button className="btn btn-quiet" onClick={send} disabled={busy}>
                {busy ? "Sending…" : invoice.sent_at ? "Send again" : `Email to ${contact?.name ?? "athlete"}`}
              </button>
            </>
          )}
          <button className="btn btn-quiet" onClick={() => window.print()}>
            Save as PDF
          </button>
          {invoice.status === "open" && (
            <button className="btn btn-primary" onClick={() => setPaying(invoice)}>
              Record payment
            </button>
          )}
        </div>
      </div>

      {status && (
        <p className="no-print mb-6 rounded-[14px] border border-hair bg-surface px-5 py-4 text-[15px]" role="status">
          {status}
        </p>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
        <InvoicePaper invoice={invoice} gymName={settings.gymName} billTo={contact?.name && client && contact.name !== client.first_name ? contact.name : athlete} athlete={athlete} />

        <aside className="no-print space-y-6 text-[15px]">
          <div>
            <h2 className="mb-3 font-semibold">Activity</h2>
            <ul className="space-y-2.5 text-dim">
              <li>Created {fmtDate(invoice.issued, { month: "long", day: "numeric" })}</li>
              {invoice.sent_at && <li>Emailed {fmtDate(invoice.sent_at, { month: "long", day: "numeric" })}</li>}
              {invoice.paid_at && <li className="text-ice">Paid {fmtDate(invoice.paid_at, { month: "long", day: "numeric" })}</li>}
              {invoice.status === "void" && <li>Voided</li>}
            </ul>
          </div>
          {client && (
            <div className="border-t border-hair pt-5">
              <h2 className="mb-2 font-semibold">Athlete</h2>
              <Link href={`/clients/${client.id}?tab=billing`} className="text-dim hover:text-ice">
                {athlete}
              </Link>
            </div>
          )}
          {(invoice.status === "open" || invoice.method === "card") && (
          <div className="border-t border-hair pt-5">
            <h2 className="mb-3 font-semibold">{invoice.status === "paid" ? "Fees on this payment" : "If paid by card"}</h2>
            <dl className="space-y-1.5 text-dim">
              <div className="flex justify-between">
                <dt>Card processing</dt>
                <dd className="num">−{money(fee.processor)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Platform fee</dt>
                <dd className="num">−{money(fee.platform)}</dd>
              </div>
              <div className="flex justify-between border-t border-hair pt-2 text-ink">
                <dt>You keep</dt>
                <dd className="num">{money(fee.net)}</dd>
              </div>
            </dl>
          </div>
          )}
        </aside>
      </div>

      <MarkPaidSheet invoice={paying} onClose={() => setPaying(null)} onSaved={reload} />
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <InvoicePage />
    </AppShell>
  );
}
