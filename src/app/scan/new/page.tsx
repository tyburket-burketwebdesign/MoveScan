"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { scoreColor } from "@/components/viz";
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
    ? "First name is required."
    : !form.consent
      ? "Consent is required before saving a scan."
      : minor && !form.guardian_email && !form.guardian_phone
        ? "Client is under 18: add a parent or guardian email or phone."
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
      setError(e instanceof Error ? e.message : "Could not save the scan.");
      setSaving(false);
    }
  }

  const ft = form.height_in ? Math.floor(form.height_in / 12) : "";
  const inch = form.height_in ? Math.round(form.height_in % 12) : "";

  return (
    <div className="space-y-5">
      {/* progress */}
      <div className="no-print flex items-center gap-1.5 overflow-x-auto pb-1">
        {["Client", ...battery.map((m) => m.label), "Review"].map((label, i) => (
          <button
            key={label}
            disabled={i > 0 && !!intakeError}
            onClick={() => setStep(i)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${
              i === step ? "border-accent bg-accent/15 text-accent" : i < step ? "border-line text-ink" : "border-line text-faint"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <span className="shrink-0 font-mono text-sm" style={{ color: scoreColor(score.total.pct) }}>
          {Math.round(score.total.pct ?? 0)}%
        </span>
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <div className="panel p-5">
            <p className="label mb-3">Who are we scanning?</p>
            <select
              className="field"
              value={clientId ?? ""}
              onChange={(e) => setClientId(e.target.value || null)}
            >
              <option value="">+ New client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  Retest: {fullName(c)}
                </option>
              ))}
            </select>
          </div>

          <div className="panel grid gap-4 p-5 sm:grid-cols-2">
            <p className="label sm:col-span-2">Client info</p>
            <F label="First name *"><input className="field" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></F>
            <F label="Last name"><input className="field" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></F>
            <F label="Email"><input className="field" type="email" inputMode="email" value={form.email ?? ""} onChange={(e) => set("email", str(e.target.value))} /></F>
            <F label="Phone"><input className="field" type="tel" inputMode="tel" value={form.phone ?? ""} onChange={(e) => set("phone", str(e.target.value))} /></F>
            <F label={`Date of birth${age !== null ? ` (${age} yrs)` : ""}`}><input className="field" type="date" value={form.dob ?? ""} onChange={(e) => set("dob", str(e.target.value))} /></F>
            <F label="Sport / position"><input className="field" value={form.sport ?? ""} onChange={(e) => set("sport", str(e.target.value))} /></F>
            <F label="Height">
              <div className="flex gap-2">
                <input className="field" inputMode="numeric" placeholder="ft" value={ft} onChange={(e) => set("height_in", e.target.value === "" && inch === "" ? null : Number(e.target.value || 0) * 12 + Number(inch || 0))} />
                <input className="field" inputMode="numeric" placeholder="in" value={inch} onChange={(e) => set("height_in", Number(ft || 0) * 12 + Number(e.target.value || 0))} />
              </div>
            </F>
            <F label="Weight (lb)"><input className="field" inputMode="decimal" value={form.weight_lb ?? ""} onChange={(e) => set("weight_lb", num(e.target.value))} /></F>
            <F label="Injury history" wide><textarea className="field" value={form.injuries ?? ""} onChange={(e) => set("injuries", str(e.target.value))} /></F>
            <F label="Goals" wide><textarea className="field" value={form.goals ?? ""} onChange={(e) => set("goals", str(e.target.value))} /></F>

            {minor && (
              <>
                <p className="label pt-2 text-warn sm:col-span-2">Under 18: reports and reminders go to the parent or guardian</p>
                <F label="Parent / guardian name"><input className="field" value={form.guardian_name ?? ""} onChange={(e) => set("guardian_name", str(e.target.value))} /></F>
                <F label="Parent email"><input className="field" type="email" value={form.guardian_email ?? ""} onChange={(e) => set("guardian_email", str(e.target.value))} /></F>
                <F label="Parent phone"><input className="field" type="tel" value={form.guardian_phone ?? ""} onChange={(e) => set("guardian_phone", str(e.target.value))} /></F>
              </>
            )}

            <label className="flex items-start gap-3 rounded-xl border border-line p-4 sm:col-span-2">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--color-accent)]" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} />
              <span className="text-sm text-dim">
                {minor ? "The parent or guardian agrees" : "Client agrees"} to have assessment results stored and to receive results and retest reminders by email or text.
              </span>
            </label>
          </div>
        </div>
      )}

      {movement && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="label">Test {step} of {battery.length}</p>
              <h1 className="text-3xl font-semibold tracking-tight">{movement.label}</h1>
              <p className="mt-1 max-w-2xl text-dim">{movement.cue}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl" style={{ color: scoreColor(score.movements[step - 1].score.pct) }}>
                {skipped.has(movement.key) ? "—" : `${Math.round(score.movements[step - 1].score.pct ?? 0)}%`}
              </span>
              <button
                className={`btn ${skipped.has(movement.key) ? "btn-primary" : "btn-ghost"} !min-h-10 text-sm`}
                onClick={() =>
                  setSkipped((s) => {
                    const n = new Set(s);
                    if (n.has(movement.key)) n.delete(movement.key);
                    else n.add(movement.key);
                    return n;
                  })
                }
              >
                {skipped.has(movement.key) ? "Skipped (tap to test)" : "Skip test"}
              </button>
            </div>
          </div>

          <div className={`panel divide-y divide-line ${skipped.has(movement.key) ? "pointer-events-none opacity-30" : ""}`}>
            <div className="flex items-center justify-between px-4 py-2">
              <span className="label">Compensation</span>
              <span className="label flex w-[184px] justify-around"><span>Right</span><span>Left</span></span>
            </div>
            {movement.compensations.map((comp) => (
              <div key={comp.key} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-lg">{comp.label}</span>
                {comp.type === "side" ? (
                  <div className="flex gap-2">
                    {(["R", "L"] as Side[]).map((side) => (
                      <Toggle key={side} on={fails.has(slotId(movement.key, comp.key, side))} onClick={() => toggle(slotId(movement.key, comp.key, side))} label={side} />
                    ))}
                  </div>
                ) : (
                  <Toggle wide on={fails.has(slotId(movement.key, comp.key, "W"))} onClick={() => toggle(slotId(movement.key, comp.key, "W"))} label="Whole body" />
                )}
              </div>
            ))}
          </div>

          <textarea
            className="field"
            placeholder={`Notes on the ${movement.label.toLowerCase()} (optional)`}
            value={notes[movement.key] ?? ""}
            onChange={(e) => setNotes((n) => ({ ...n, [movement.key]: e.target.value }))}
          />
        </div>
      )}

      {step === last && (
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">Review</h1>
          <div className="panel grid gap-3 p-5 sm:grid-cols-2">
            <div>
              <p className="label">Client</p>
              <p className="text-lg">{fullName(form) || "—"}</p>
            </div>
            <div className="sm:text-right">
              <p className="label">Total score</p>
              <p className="font-mono text-4xl" style={{ color: scoreColor(score.total.pct) }}>
                {score.total.pct?.toFixed(2)}%
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-sm sm:col-span-2">
              <span>Right {score.right.pct?.toFixed(1)}%</span>
              <span>Left {score.left.pct?.toFixed(1)}%</span>
              <span>Synergy {score.synergistic.pct?.toFixed(1)}%</span>
            </div>
          </div>
          <div className="panel divide-y divide-line">
            {score.movements.map((m, i) => (
              <button key={m.key} onClick={() => setStep(i + 1)} className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-panel-2">
                <span>{m.label}</span>
                <span className="font-mono" style={{ color: m.skipped ? undefined : scoreColor(m.score.pct) }}>
                  {m.skipped ? "skipped" : `${m.score.pct?.toFixed(1)}%`}
                </span>
              </button>
            ))}
          </div>
          {error && <p className="text-bad">{error}</p>}
        </div>
      )}

      <div className="no-print sticky bottom-0 -mx-4 flex gap-3 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          ← Back
        </button>
        <div className="flex-1 self-center text-sm text-bad">{step === 0 && intakeError && form.first_name ? intakeError : ""}</div>
        {step < last ? (
          <button className="btn btn-primary min-w-40" disabled={step === 0 && !!intakeError} onClick={() => setStep((s) => s + 1)}>
            {step === 0 ? "Start tests →" : step === battery.length ? "Review →" : "Next test →"}
          </button>
        ) : (
          <button className="btn btn-primary min-w-40" disabled={saving || !!intakeError} onClick={submit}>
            {saving ? "Saving…" : "Save scan"}
          </button>
        )}
      </div>
    </div>
  );
}

function Toggle({ on, onClick, label, wide }: { on: boolean; onClick: () => void; label: string; wide?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`h-14 rounded-xl border-2 font-mono text-lg font-semibold transition active:scale-95 ${wide ? "w-[184px]" : "w-[88px]"} ${
        on ? "border-bad bg-bad/20 text-bad shadow-[0_0_16px_rgba(244,63,94,.35)]" : "border-line bg-bg text-faint"
      }`}
    >
      {on ? `✕ ${label}` : label}
    </button>
  );
}

function F({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-sm text-dim">{label}</span>
      {children}
    </label>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<p className="text-dim">Loading…</p>}>
        <NewScan />
      </Suspense>
    </AppShell>
  );
}
