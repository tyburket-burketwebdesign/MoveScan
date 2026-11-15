"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { heat, scoreColor, ThermalBody } from "@/components/viz";
import { DEFAULT_BATTERY } from "@/lib/battery";
import { scoreScan, slotId, type Side } from "@/lib/scoring";
import { store } from "@/lib/store";
import { addDays, ageFromDob, fullName, RETEST_DAYS, type Client, type NewClient } from "@/lib/types";

const EMPTY: NewClient = {
  first_name: "", last_name: "", email: null, phone: null, dob: null, height_in: null, weight_lb: null,
  sport: null, injuries: null, goals: null, guardian_name: null, guardian_email: null, guardian_phone: null, consent: false,
};

function NewScan() {
  const router = useRouter();
  const params = useSearchParams();
  const battery = DEFAULT_BATTERY;
  const [step, setStep] = useState(0); // 0 = client, 1..n = movements, n+1 = review
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string | null>(params.get("client"));
  const [form, setForm] = useState<NewClient>(EMPTY);
  const [fails, setFails] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    store.listClients().then(setClients);
  }, []);

  useEffect(() => {
    if (!clientId) return setForm(EMPTY);
    store.getClient(clientId).then((c) => {
      if (c) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, created_at: _c, ...rest } = c;
        setForm(rest);
      }
    });
  }, [clientId]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const score = useMemo(() => scoreScan({ fails: [...fails], skipped: [...skipped] }, battery), [fails, skipped, battery]);
  const last = battery.length + 1;
  const movement = step >= 1 && step <= battery.length ? battery[step - 1] : null;
  const age = ageFromDob(form.dob);
  const minor = age !== null && age < 18;

  const set = <K extends keyof NewClient>(k: K, v: NewClient[K]) => setForm((f) => ({ ...f, [k]: v }));
  const str = (v: string) => (v.trim() === "" ? null : v);
  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const toggle = (id: string) =>
    setFails((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const intakeError = !form.first_name.trim()
    ? "Add the athlete's first name."
    : minor && !form.guardian_email
      ? "This athlete is under 18. Add a parent or guardian email."
      : !form.consent
        ? "Check the consent box to continue."
        : null;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const client = await store.saveClient({ ...form, ...(clientId ? { id: clientId } : {}) });
      const now = new Date().toISOString();
      const scan = await store.createScan({
        client_id: client.id,
        performed_at: now,
        fails: [...fails],
        skipped: [...skipped],
        notes,
        total_pct: Number(score.total.pct!.toFixed(2)),
        retest_due: addDays(now, RETEST_DAYS),
      });
      router.push(`/scans/${scan.id}?new=1`);
    } catch (e) {
      setError(e instanceof Error ? `The scan didn't save: ${e.message}` : "The scan didn't save. Check the connection and try again.");
      setSaving(false);
    }
  }

  const ft = form.height_in ? Math.floor(form.height_in / 12) : "";
  const inch = form.height_in ? Math.round(form.height_in % 12) : "";
  const steps = ["Client", ...battery.map((m) => m.label), "Review"];
  const movementScore = movement ? score.movements[step - 1] : null;

  return (
    <div className="pb-28">
      {/* progress */}
      <div className="no-print mb-8">
        <div className="mb-3 flex items-center justify-between text-sm">
          <Link href="/" className="text-dim hover:text-ink">
            Cancel
          </Link>
          <span className="text-dim">
            {step === 0 ? "Athlete details" : step === last ? "Review" : `Test ${step} of ${battery.length}`}
          </span>
        </div>
        <div className="flex gap-1.5">
          {steps.map((label, i) => (
            <button
              key={label}
              aria-label={label}
              disabled={i > 0 && !!intakeError}
              onClick={() => setStep(i)}
              className={`h-[3px] flex-1 rounded-full transition-colors ${i === step ? "bg-paper" : i < step ? "bg-dim" : "bg-line"}`}
            />
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="mx-auto max-w-3xl space-y-8">
          <div>
            <h1 className="title text-[2.25rem] sm:text-[3rem]">{clientId ? `Retest ${form.first_name}` : "Who are we scanning?"}</h1>
            <p className="mt-3 text-dim">{clientId ? "Check their details are still right, then start." : "Pick an athlete to retest, or add someone new."}</p>
          </div>

          <select className="field !min-h-14 text-[17px]" value={clientId ?? ""} onChange={(e) => setClientId(e.target.value || null)} aria-label="Athlete">
            <option value="">New athlete</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {fullName(c)}
              </option>
            ))}
          </select>

          <Section title="Basics">
            <F label="First name"><input className="field" autoComplete="off" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} onBlur={() => setTouched(true)} /></F>
            <F label="Last name"><input className="field" autoComplete="off" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></F>
            <F label={age !== null ? `Date of birth (${age})` : "Date of birth"}><input className="field" type="date" value={form.dob ?? ""} onChange={(e) => set("dob", str(e.target.value))} /></F>
            <F label="Sport or position"><input className="field" value={form.sport ?? ""} onChange={(e) => set("sport", str(e.target.value))} /></F>
            <F label="Height">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input className="field !pr-10" inputMode="numeric" value={ft} onChange={(e) => set("height_in", e.target.value === "" && inch === "" ? null : Number(e.target.value || 0) * 12 + Number(inch || 0))} aria-label="Feet" />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-faint">ft</span>
                </div>
                <div className="relative flex-1">
                  <input className="field !pr-10" inputMode="numeric" value={inch} onChange={(e) => set("height_in", Number(ft || 0) * 12 + Number(e.target.value || 0))} aria-label="Inches" />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-faint">in</span>
                </div>
              </div>
            </F>
            <F label="Weight">
              <div className="relative">
                <input className="field !pr-10" inputMode="decimal" value={form.weight_lb ?? ""} onChange={(e) => set("weight_lb", num(e.target.value))} />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-faint">lb</span>
              </div>
            </F>
          </Section>

          {minor ? (
            <Section title="Parent or guardian" note="This athlete is under 18, so results and reminders go to a parent.">
              <F label="Name" wide><input className="field" value={form.guardian_name ?? ""} onChange={(e) => set("guardian_name", str(e.target.value))} /></F>
              <F label="Email"><input className="field" type="email" inputMode="email" value={form.guardian_email ?? ""} onChange={(e) => set("guardian_email", str(e.target.value))} /></F>
              <F label="Phone"><input className="field" type="tel" value={form.guardian_phone ?? ""} onChange={(e) => set("guardian_phone", str(e.target.value))} /></F>
            </Section>
          ) : (
            <Section title="Contact" note="Results and retest reminders go here.">
              <F label="Email"><input className="field" type="email" inputMode="email" value={form.email ?? ""} onChange={(e) => set("email", str(e.target.value))} /></F>
              <F label="Phone"><input className="field" type="tel" inputMode="tel" value={form.phone ?? ""} onChange={(e) => set("phone", str(e.target.value))} /></F>
            </Section>
          )}

          <Section title="History">
            <F label="Injuries" wide><textarea className="field" placeholder="Past injuries, surgeries, anything that hurts now" value={form.injuries ?? ""} onChange={(e) => set("injuries", str(e.target.value))} /></F>
            <F label="Goals" wide><textarea className="field" placeholder="What they want out of training" value={form.goals ?? ""} onChange={(e) => set("goals", str(e.target.value))} /></F>
          </Section>

          <label className="flex cursor-pointer items-start gap-4 surface p-5">
            <input type="checkbox" className="mt-0.5 h-6 w-6 shrink-0 accent-[var(--color-ice)]" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} />
            <span className="text-dim">
              {minor ? "The parent or guardian agrees" : "The athlete agrees"} to have their assessment results stored, and to receive results and retest reminders by email.
            </span>
          </label>
        </div>
      )}

      {movement && movementScore && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <h1 className="title text-[2.25rem] sm:text-[3rem]">{movement.label}</h1>
                <p className="mt-3 text-dim">{movement.cue}</p>
              </div>
              <button
                className={`btn ${skipped.has(movement.key) ? "btn-primary" : "btn-quiet"} !min-h-11`}
                onClick={() =>
                  setSkipped((s) => {
                    const n = new Set(s);
                    if (n.has(movement.key)) n.delete(movement.key);
                    else n.add(movement.key);
                    return n;
                  })
                }
              >
                {skipped.has(movement.key) ? "Test this movement" : "Skip this test"}
              </button>
            </div>

            {skipped.has(movement.key) ? (
              <p className="surface p-6 text-dim">Skipped. This test won&apos;t count toward the score.</p>
            ) : (
              <div className="surface overflow-hidden">
                <div className="flex items-center justify-between border-b border-hair px-5 py-3.5 text-sm text-dim sm:px-6">
                  <span>Tap what you see</span>
                  <span className="flex w-[180px] justify-around sm:w-[196px]">
                    <span>Right</span>
                    <span>Left</span>
                  </span>
                </div>
                {movement.compensations.map((comp) => (
                  <div key={comp.key} className="flex items-center justify-between gap-3 border-b border-hair px-5 py-2.5 sm:px-6 last:border-0">
                    <span className="text-[17px]">{comp.label}</span>
                    {comp.type === "side" ? (
                      <div className="flex gap-2">
                        {(["R", "L"] as Side[]).map((side) => (
                          <Toggle key={side} on={fails.has(slotId(movement.key, comp.key, side))} onClick={() => toggle(slotId(movement.key, comp.key, side))} label={side === "R" ? "Right" : "Left"} short={side} />
                        ))}
                      </div>
                    ) : (
                      <Toggle wide on={fails.has(slotId(movement.key, comp.key, "W"))} onClick={() => toggle(slotId(movement.key, comp.key, "W"))} label="Whole body" short="Whole body" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <textarea
              className="field mt-4"
              placeholder="Notes for this test (optional)"
              value={notes[movement.key] ?? ""}
              onChange={(e) => setNotes((n) => ({ ...n, [movement.key]: e.target.value }))}
            />
          </div>

          {/* live readout */}
          <aside className="surface hidden h-fit flex-col items-center gap-4 p-6 lg:sticky lg:top-10 lg:flex">
            <div className="flex w-full items-baseline justify-between">
              <span className="text-sm text-dim">{movement.label}</span>
              <span className="readout text-4xl" style={{ color: movementScore.skipped ? undefined : scoreColor(movementScore.score.pct) }}>
                {movementScore.skipped ? "–" : `${Math.round(movementScore.score.pct ?? 0)}%`}
              </span>
            </div>
            <div className="flex gap-1">
              <ThermalBody regions={score.regions} view="front" height={250} showSides={false} />
              <ThermalBody regions={score.regions} view="back" height={250} showSides={false} />
            </div>
            <div className="flex w-full items-baseline justify-between border-t border-line pt-4">
              <span className="text-sm text-dim">Total so far</span>
              <span className="readout text-4xl" style={{ color: scoreColor(score.total.pct) }}>
                {Math.round(score.total.pct ?? 0)}%
              </span>
            </div>
          </aside>
        </div>
      )}

      {step === last && (
        <div className="mx-auto max-w-3xl space-y-8">
          <div>
            <h1 className="title text-[2.25rem] sm:text-[3rem]">Review {form.first_name}&apos;s scan</h1>
            <p className="mt-3 text-dim">Tap a test to change it. Saving sets the retest for {RETEST_DAYS} days from today.</p>
          </div>
          <div className="surface flex flex-col items-center gap-6 p-8 sm:flex-row sm:justify-between">
            <div>
              <p className="text-dim">Total score</p>
              <p className="readout text-8xl" style={{ color: scoreColor(score.total.pct) }}>
                {score.total.pct?.toFixed(1)}
                <span className="text-[0.4em] text-dim">%</span>
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-6 text-center">
              {[["Right", score.right.pct], ["Left", score.left.pct], ["Whole body", score.synergistic.pct]].map(([l, v]) => (
                <div key={l as string}>
                  <dt className="text-sm text-dim">{l}</dt>
                  <dd className="num text-2xl">{(v as number).toFixed(1)}%</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="surface divide-y divide-[var(--color-hair)] overflow-hidden">
            {score.movements.map((m, i) => (
              <button key={m.key} onClick={() => setStep(i + 1)} className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-white/[0.03]">
                <span className="text-lg">{m.label}</span>
                <span className="flex items-center gap-4">
                  {!m.skipped && (
                    <span className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-line sm:block">
                      <span className="block h-full rounded-full" style={{ width: `${m.score.pct}%`, background: scoreColor(m.score.pct) }} />
                    </span>
                  )}
                  <span className="num w-16 text-right" style={{ color: m.skipped ? undefined : scoreColor(m.score.pct) }}>
                    {m.skipped ? <span className="font-normal text-faint">Skipped</span> : `${m.score.pct?.toFixed(1)}%`}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {error && <p className="rounded-2xl bg-hot/10 p-4 text-hot">{error}</p>}
        </div>
      )}

      <div
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-hair bg-bg/90 backdrop-blur-xl md:left-[248px]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3 sm:px-8 md:px-12">
          <button className="btn btn-quiet" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Back
          </button>
          <p className="flex-1 text-center text-sm text-amber">{step === 0 && touched && intakeError ? intakeError : ""}</p>
          {movement && (
            <span className="num mr-2 lg:hidden" style={{ color: scoreColor(score.total.pct) }}>
              {Math.round(score.total.pct ?? 0)}%
            </span>
          )}
          {step < last ? (
            <button
              className="btn btn-primary min-w-36"
              onClick={() => {
                if (step === 0 && intakeError) return setTouched(true);
                setStep((s) => s + 1);
              }}
            >
              {step === 0 ? "Start tests" : step === battery.length ? "Review" : "Next test"}
            </button>
          ) : (
            <button className="btn btn-primary min-w-36" disabled={saving || !!intakeError} onClick={submit}>
              {saving ? "Saving…" : "Save scan"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onClick, label, short, wide }: { on: boolean; onClick: () => void; label: string; short: string; wide?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      aria-label={`${label}${on ? ", found" : ""}`}
      className={`h-[52px] rounded-[12px] text-[15px] font-semibold transition-[background-color,color,transform] duration-100 active:scale-95 ${wide ? "w-[180px] sm:w-[196px]" : "w-[86px] sm:w-[94px]"} ${
        on ? "text-bg" : "bg-white/[0.04] text-faint shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] hover:text-dim"
      }`}
      style={on ? { background: heat(0.72), boxShadow: `0 6px 20px -6px ${heat(0.72, 0.6)}` } : undefined}
    >
      {short}
    </button>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {note && <p className="mt-1 text-sm text-dim">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function F({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-2 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-sm text-dim">{label}</span>
      {children}
    </label>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <NewScan />
      </Suspense>
    </AppShell>
  );
}
