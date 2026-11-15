"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell, { Loading } from "@/components/AppShell";
import { deltaColor, HistoryChart, scoreColor, ThermalBody } from "@/components/viz";
import ProgramView from "@/components/ProgramView";
import { buildProgram } from "@/lib/program";
import { scoreScan } from "@/lib/scoring";
import { useSettings } from "@/lib/useSettings";
import { store } from "@/lib/store";
import { ageFromDob, contactFor, fullName, isMinor, retestStatus, type Client, type Scan } from "@/lib/types";

function Profile() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null | undefined>(undefined);
  const [scans, setScans] = useState<Scan[]>([]);
  const { settings } = useSettings();

  useEffect(() => {
    store.getClient(id).then(setClient);
    store.listScans(id).then(setScans);
  }, [id]);

  if (client === undefined) return <Loading />;
  if (client === null)
    return (
      <div className="surface p-8">
        <p className="text-xl font-semibold">This athlete isn&apos;t here</p>
        <p className="mt-2 text-dim">They may have been removed, or the link is wrong.</p>
        <Link href="/clients" className="btn btn-quiet mt-5">
          Back to athletes
        </Link>
      </div>
    );

  const age = ageFromDob(client.dob);
  const contact = contactFor(client);
  const latest = scans[0];
  const st = latest ? retestStatus(latest.retest_due) : null;
  const h = client.height_in ? `${Math.floor(client.height_in / 12)}′${Math.round(client.height_in % 12)}″` : null;
  const facts = [
    age !== null && ["Age", `${age}`],
    h && ["Height", h],
    client.weight_lb && ["Weight", `${client.weight_lb} lb`],
    client.sport && ["Sport", client.sport],
  ].filter(Boolean) as [string, string][];

  return (
    <div className="space-y-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="title text-[2.5rem] sm:text-[3.5rem]">{fullName(client)}</h1>
          {latest && (
            <p className={`mt-3 text-lg ${st === "overdue" ? "text-hot" : st === "due_soon" ? "text-amber" : "text-dim"}`}>
              {st === "overdue" ? "Retest overdue since" : "Next retest"} {new Date(latest.retest_due + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric" })}
            </p>
          )}
        </div>
        <Link href={`/scan/new?client=${client.id}`} className="btn btn-primary !min-h-12 !px-6">
          {scans.length ? "Start retest" : "Run first scan"}
        </Link>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="surface p-6 sm:p-8">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold">Progress</h2>
            {latest && (
              <span className="readout text-5xl" style={{ color: scoreColor(Number(latest.total_pct)) }}>
                {Math.round(Number(latest.total_pct))}
              </span>
            )}
          </div>
          <HistoryChart points={[...scans].reverse().map((s) => ({ date: s.performed_at, pct: Number(s.total_pct) }))} />
        </div>

        <div className="surface flex flex-col items-center p-6 sm:p-8">
          <h2 className="mb-4 self-start text-lg font-semibold">Latest heat map</h2>
          {latest ? (
            <Link href={`/scans/${latest.id}`} className="flex gap-1" aria-label="Open latest scan">
              <ThermalBody regions={scoreScan(latest).regions} view="front" height={230} showSides={false} />
              <ThermalBody regions={scoreScan(latest).regions} view="back" height={230} showSides={false} />
            </Link>
          ) : (
            <p className="text-dim">Appears after the first scan.</p>
          )}
        </div>
      </section>

      {latest && settings && (
        <section className="surface px-6 py-8 sm:px-10">
          <h2 className="title mb-2 text-2xl">Current program</h2>
          <p className="mb-8 text-dim">Built from the {new Date(latest.performed_at).toLocaleDateString(undefined, { month: "long", day: "numeric" })} scan.</p>
          <ProgramView program={buildProgram(latest.fails, settings.mapping ?? undefined)} compact />
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="surface p-6 sm:p-8">
          <h2 className="mb-4 text-lg font-semibold">Scan history</h2>
          {scans.length === 0 ? (
            <p className="text-dim">No scans yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-hair)]">
              {scans.map((s, i) => {
                const prev = scans[i + 1];
                const d = prev ? Number(s.total_pct) - Number(prev.total_pct) : null;
                return (
                  <li key={s.id}>
                    <Link href={`/scans/${s.id}`} className="flex items-center justify-between gap-4 py-4 hover:text-ice">
                      <span className="font-medium">
                        {new Date(s.performed_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                      </span>
                      <span className="flex items-baseline gap-4">
                        {d !== null && Math.abs(d) >= 0.5 && (
                          <span className="num text-sm" style={{ color: deltaColor(d) }}>
                            {d > 0 ? "+" : "−"}
                            {Math.abs(Math.round(d))}
                          </span>
                        )}
                        <span className="num w-12 text-right text-lg" style={{ color: scoreColor(Number(s.total_pct)) }}>
                          {Math.round(Number(s.total_pct))}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="surface space-y-6 p-6 sm:p-8">
          {facts.length > 0 && (
            <dl className="grid grid-cols-2 gap-4">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-sm text-dim">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="space-y-2 border-t border-line pt-5">
            <h3 className="font-semibold">{isMinor(client) ? "Parent or guardian" : "Contact"}</h3>
            <p>{contact.name}</p>
            {contact.email && <a href={`mailto:${contact.email}`} className="block text-dim hover:text-ice">{contact.email}</a>}
            {contact.phone && <a href={`tel:${contact.phone}`} className="block text-dim hover:text-ice">{contact.phone}</a>}
            {!contact.email && <p className="text-sm text-amber">No email on file, so reports can&apos;t be sent.</p>}
          </div>
          {(client.injuries || client.goals) && (
            <div className="space-y-4 border-t border-line pt-5 text-sm">
              {client.injuries && (
                <div>
                  <h3 className="mb-1 font-semibold">Injuries</h3>
                  <p className="text-dim">{client.injuries}</p>
                </div>
              )}
              {client.goals && (
                <div>
                  <h3 className="mb-1 font-semibold">Goals</h3>
                  <p className="text-dim">{client.goals}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
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
