"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/AppShell";
import { isLive, supabase } from "@/lib/store";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isLive)
    return (
      <div className="mx-auto mt-24 max-w-sm px-4 text-center">
        <Logo />
        <p className="mt-6 text-dim">Running in demo mode, no login needed.</p>
        <button className="btn btn-primary mt-6" onClick={() => router.push("/")}>Open the app</button>
      </div>
    );

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMsg(error.message);
    else router.replace("/");
  }

  return (
    <form onSubmit={go} className="mx-auto mt-24 max-w-sm space-y-4 px-4">
      <Logo />
      <h1 className="pt-4 text-2xl font-semibold">Trainer sign in</h1>
      <input className="field" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="field" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      {msg && <p className="text-sm text-bad">{msg}</p>}
    </form>
  );
}
