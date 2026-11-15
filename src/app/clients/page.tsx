"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import AppShell, { Loading, PageHeader } from "@/components/AppShell";
import { Avatar, Field, Pill, Sheet } from "@/components/ui";
import { scoreColor } from "@/components/viz";
import { money } from "@/lib/billing";
import { loadGym, store } from "@/lib/store";
import { compliance, indexLogs } from "@/lib/training";
import { ageFromDob, fullName, retestStatus, todayISO } from "@/lib/types";
import { useLoad } from "@/lib/useSettings";

function Athletes() {
  const router = useRouter();
  const [gym] = useLoad(loadGym);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", sport: "" });
  const today = todayISO();

  const rows = useMemo(() => {
    if (!gym) return [];
    const logMap = indexLogs(gym.logs);
    return gym.clients.map((c) => {
      const scan = gym.scans.find((s) => s.client_id === c.id);
      const sub = gym.subs.find((s) => s.client_id === c.id && s.status === "active");
      const mine = gym.sessions.filter((s) => s.assignment.client_id === c.id);
      return { c, scan, sub, program: mine[0]?.assignment.program.name ?? null, adherence: compliance(mine, logMap, today).pct };
    });
  }, [gym, today]);

  if (!gym) return <Loading />;
  const list = rows.filter((r) => fullName(r.c).toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Athletes" sub={`${gym.clients.length} active`}>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          Add an athlete
        </button>
      </PageHeader>

      <input className="field mb-6 !min-h-12" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search athletes" />

      {list.length === 0 ? (
        <p className="surface p-8 text-dim">{q ? `No one matches “${q}”.` : "No athletes yet. Add your first one to get started."}</p>
      ) : (
        <div className="surface overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)_110px_64px] gap-4 border-b border-hair px-8 py-3 text-sm text-faint lg:grid">
            <span>Athlete</span>
            <span>Program</span>
            <span>Membership</span>
            <span>Adherence</span>
            <span className="text-right">Score</span>
          </div>
          <ul className="divide-y divide-[var(--color-hair)]">
            {list.map(({ c, scan, sub, program, adherence }) => {
              const st = scan ? retestStatus(scan.retest_due) : null;
              const age = ageFromDob(c.dob);
              return (
                <li key={c.id}>
                  <Link href={`/clients/${c.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03] sm:px-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)_110px_64px]">
                    <span className="flex min-w-0 items-center gap-4">
                      <Avatar who={c} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold">{fullName(c)}</span>
                          {st && st !== "ok" && <Pill tone={st === "overdue" ? "bad" : "warn"}>Retest</Pill>}
                        </span>
                        <span className="block truncate text-sm text-dim">{[age !== null && `${age}`, c.sport].filter(Boolean).join(", ") || "No details yet"}</span>
                      </span>
                    </span>
                    <span className="hidden truncate text-[15px] lg:block">{program ?? <span className="text-faint">No program</span>}</span>
                    <span className="hidden truncate text-[15px] lg:block">{sub ? `${sub.name}, ${money(sub.price)}` : <span className="text-faint">No membership</span>}</span>
                    <span className="hidden items-center gap-2.5 lg:flex">
                      {adherence === null ? (
                        <span className="text-faint">–</span>
                      ) : (
                        <>
                          <span className="h-[3px] w-14 overflow-hidden rounded-full bg-line">
                            <span className="block h-full rounded-full" style={{ width: `${adherence}%`, background: scoreColor(adherence) }} />
                          </span>
                          <span className="num text-sm">{Math.round(adherence)}%</span>
                        </>
                      )}
                    </span>
                    <span className="readout text-right text-3xl" style={{ color: scan ? scoreColor(Number(scan.total_pct)) : undefined }}>
                      {scan ? Math.round(Number(scan.total_pct)) : <span className="text-faint">–</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add an athlete">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <input className="field" autoComplete="off" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </Field>
          <Field label="Last name">
            <input className="field" autoComplete="off" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </Field>
          <Field label="Email" wide hint="For their app link, reports and invoices. A parent's email works for younger athletes.">
            <input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Sport or position" wide>
            <input className="field" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} />
          </Field>
          <button
            className="btn btn-primary sm:col-span-2"
            disabled={!form.first_name.trim()}
            onClick={async () => {
              const c = await store.saveClient({
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                email: form.email.trim() || null,
                sport: form.sport.trim() || null,
                phone: null, dob: null, height_in: null, weight_lb: null, injuries: null, goals: null,
                guardian_name: null, guardian_email: null, guardian_phone: null, consent: false,
              });
              router.push(`/clients/${c.id}`);
            }}
          >
            Add athlete
          </button>
        </div>
      </Sheet>
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Athletes />
    </AppShell>
  );
}
