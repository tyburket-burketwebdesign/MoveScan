"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { HistoryChart, scoreColor } from "@/components/viz";
import { store } from "@/lib/store";
import { ageFromDob, contactFor, fullName, isMinor, retestStatus, type Client, type Scan } from "@/lib/types";

function Profile() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null | undefined>(undefined);
  const [scans, setScans] = useState<Scan[]>([]);

  useEffect(() => {
    store.getClient(id).then(setClient);
    store.listScans(id).then(setScans);
  }, [id]);

  if (client === undefined) return <p className="text-dim">Loading…</p>;
  if (client === null) return <p className="text-dim">Client not found.</p>;

  const age = ageFromDob(client.dob);
  const contact = contactFor(client);
  const latest = scans[0];
  const st = latest ? retestStatus(latest.retest_due) : null;
  const h = client.height_in ? `${Math.floor(client.height_in / 12)}'${Math.round(client.height_in % 12)}"` : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Client</p>
          <h1 className="text-3xl font-semibold tracking-tight">{fullName(client)}</h1>
          <p className="text-dim">{[age !== null && `${age} yrs`, h, client.weight_lb && `${client.weight_lb} lb`, client.sport].filter(Boolean).join(" · ")}</p>
        </div>
        <Link href={`/scan/new?client=${client.id}`} className="btn btn-primary">
          {scans.length ? "Retest" : "Run first scan"}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="label">Total score over time</p>
            {st && (
              <span className={`font-mono text-xs ${st === "overdue" ? "text-bad" : st === "due_soon" ? "text-warn" : "text-dim"}`}>
                next retest {new Date(latest.retest_due + "T00:00:00").toLocaleDateString()}
              </span>
            )}
          </div>
          <HistoryChart points={[...scans].reverse().map((s) => ({ date: s.performed_at, pct: Number(s.total_pct) }))} />
        </section>

        <section className="panel space-y-3 p-5 text-sm">
          <p className="label">Contact {isMinor(client) && "(parent / guardian)"}</p>
          <Row k="Name" v={contact.name} />
          <Row k="Email" v={contact.email} />
          <Row k="Phone" v={contact.phone} />
          {client.injuries && <Row k="Injuries" v={client.injuries} />}
          {client.goals && <Row k="Goals" v={client.goals} />}
        </section>
      </div>

      <section className="panel p-5">
        <p className="label mb-3">Scans</p>
        {scans.length === 0 ? (
          <p className="text-sm text-dim">No scans yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {scans.map((s, i) => {
              const prev = scans[i + 1];
              const d = prev ? Number(s.total_pct) - Number(prev.total_pct) : null;
              return (
                <li key={s.id}>
                  <Link href={`/scans/${s.id}`} className="flex items-center justify-between py-3 hover:text-accent">
                    <span>
                      {new Date(s.performed_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                      {i === 0 && <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-xs text-accent">latest</span>}
                    </span>
                    <span className="flex items-center gap-3 font-mono">
                      {d !== null && Math.abs(d) >= 0.5 && (
                        <span className="text-xs" style={{ color: d > 0 ? "var(--color-good)" : "var(--color-bad)" }}>
                          {d > 0 ? "+" : "−"}
                          {Math.abs(Math.round(d))}
                        </span>
                      )}
                      <span style={{ color: scoreColor(Number(s.total_pct)) }}>{Math.round(Number(s.total_pct))}%</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-dim">{k}</span>
      <span className="text-right">{v || "—"}</span>
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Profile />
    </AppShell>
  );
}
