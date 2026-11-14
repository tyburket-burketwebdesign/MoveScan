"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isLive, resetDemo, supabase } from "@/lib/store";

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <circle cx="13" cy="13" r="11" fill="none" stroke="var(--color-accent)" strokeWidth="2" opacity=".35" />
        <path d="M3 13h5l2.5-6 5 12 2.5-6h5" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      MoveScan
    </span>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(!isLive);

  useEffect(() => {
    if (!isLive) return;
    supabase()
      .auth.getSession()
      .then(({ data }) => {
        if (!data.session) router.replace("/login");
        else setReady(true);
      });
  }, [router]);

  const nav = [
    { href: "/", label: "Home" },
    { href: "/clients", label: "Clients" },
  ];

  return (
    <div className="min-h-dvh pb-16">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
          <Link href="/" className="mr-1 sm:mr-3">
            <Logo />
          </Link>
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-lg px-3 py-2 text-sm ${path === n.href ? "bg-panel-2 text-ink" : "text-dim hover:text-ink"}`}
            >
              {n.label}
            </Link>
          ))}
          <div className="flex-1" />
          {isLive ? (
            <button
              className="hidden px-3 text-sm text-dim hover:text-ink sm:block"
              onClick={async () => {
                await supabase().auth.signOut();
                router.replace("/login");
              }}
            >
              Sign out
            </button>
          ) : null}
          <Link href="/scan/new" className="btn btn-primary !min-h-10 whitespace-nowrap !px-3 text-sm sm:!px-5">
            + <span className="hidden sm:inline">New </span>scan
          </Link>
        </div>
        {!isLive && (
          <div className="border-t border-line bg-warn/10 px-4 py-1.5 text-center text-xs text-warn">
            Demo mode: data stays on this device until the database is connected.{" "}
            <button
              className="underline"
              onClick={() => {
                if (confirm("Reset demo data back to the two sample clients?")) {
                  resetDemo();
                  location.href = "/";
                }
              }}
            >
              Reset demo
            </button>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-6">{ready ? children : <p className="text-dim">Loading…</p>}</main>
    </div>
  );
}
