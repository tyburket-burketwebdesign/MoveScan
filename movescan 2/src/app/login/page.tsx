"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/AppShell";
import { HeatLegend, ThermalBody } from "@/components/viz";
import { scoreScan } from "@/lib/scoring";
import { RALEIGH_FAILS } from "@/lib/seed";
import { isLive, supabase } from "@/lib/store";

const SAMPLE = scoreScan({ fails: RALEIGH_FAILS }).regions;

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMsg(error.message === "Invalid login credentials" ? "That email and password don't match. Try again." : error.message);
    else router.replace("/");
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-hair bg-[#0f1113] p-12 lg:flex">
        <Logo />
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-2">
            <ThermalBody regions={SAMPLE} view="front" height={440} showSides={false} guides />
            <ThermalBody regions={SAMPLE} view="back" height={440} showSides={false} guides />
          </div>
          <HeatLegend />
        </div>
        <p className="title max-w-md text-[2.25rem]">See exactly where every athlete compensates.</p>
      </div>

      <div className="flex items-center justify-center p-6">
        {isLive ? (
          <form onSubmit={go} className="w-full max-w-sm space-y-5">
            <div className="lg:hidden">
              <Logo />
            </div>
            <h1 className="title pt-6 text-[2.5rem]">Sign in</h1>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-dim">Email</span>
              <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-dim">Password</span>
              <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <button className="btn btn-primary w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            {msg && <p className="text-sm text-hot" role="alert">{msg}</p>}
          </form>
        ) : (
          <div className="max-w-sm space-y-5">
            <Logo />
            <h1 className="title pt-6 text-[2.5rem]">No sign-in needed yet</h1>
            <p className="text-dim">This copy runs in demo mode. Sign-in turns on once the database is connected.</p>
            <button className="btn btn-primary" onClick={() => router.push("/")}>
              Open MoveScan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
