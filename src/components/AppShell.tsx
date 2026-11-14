"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { isLive, resetDemo, supabase } from "@/lib/store";

export function Mark({ size = 28 }: { size?: number }) {
  // Unique gradient id per instance: a hidden copy (the rail on phones) can't own a shared one.
  const gid = `mark-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <radialGradient id={gid} cx="62%" cy="38%" r="70%">
          <stop offset="0" stopColor="#ffe28c" />
          <stop offset="0.35" stopColor="#ff7a2f" />
          <stop offset="0.65" stopColor="#e8367a" />
          <stop offset="1" stopColor="#4a2696" />
        </radialGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gid})`} />
      <path d="M5 17h6l3-7 4 13 3-6h6" fill="none" stroke="#13102a" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <Mark />
      <span className="display text-lg">MoveScan</span>
    </span>
  );
}

const Icon = {
  today: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
    </svg>
  ),
  clients: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.4 3.5 5.2" />
    </svg>
  ),
  scan: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
};

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

  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const nav = [
    { href: "/", label: "Today", icon: Icon.today },
    { href: "/clients", label: "Clients", icon: Icon.clients },
  ];

  const signOut = async () => {
    await supabase().auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-dvh md:pl-60">
      {/* rail: iPad and desktop */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line/60 bg-bg px-4 pb-5 md:flex" style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}>
        <Link href="/" className="mb-8 px-2">
          <Logo />
        </Link>
        <Link href="/scan/new" className="btn btn-primary mb-6 w-full">
          {Icon.scan} New scan
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-colors ${active(n.href) ? "bg-raised text-ink" : "text-dim hover:bg-surface hover:text-ink"}`}
            >
              {n.icon}
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex-1" />
        {isLive ? (
          <button onClick={signOut} className="rounded-xl px-3 py-2 text-left text-sm text-dim hover:text-ink">
            Sign out
          </button>
        ) : (
          <div className="rounded-xl bg-surface p-3 text-xs leading-relaxed text-dim">
            <p className="mb-1 font-semibold text-amber">Demo mode</p>
            Scans are saved on this device only until the database is connected.
            <button
              className="mt-2 block text-ink underline underline-offset-2"
              onClick={() => {
                if (confirm("Reset the demo back to the two sample clients?")) {
                  resetDemo();
                  location.href = "/";
                }
              }}
            >
              Reset demo data
            </button>
          </div>
        )}
      </aside>

      {/* top bar: phone */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line/60 bg-bg/90 px-4 backdrop-blur md:hidden" style={{ paddingTop: "env(safe-area-inset-top)", boxSizing: "content-box" }}>
        <Link href="/">
          <Logo />
        </Link>
        {isLive ? (
          <button onClick={signOut} className="text-sm text-dim">
            Sign out
          </button>
        ) : (
          <span className="rounded-full bg-amber/15 px-2.5 py-1 text-xs font-medium text-amber">Demo</span>
        )}
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pb-28 pt-6 sm:px-6 md:px-10 md:pb-16 md:pt-10">{ready ? children : <Loading />}</main>

      {/* tab bar: phone (hidden during a scan, which has its own action bar) */}
      {!path.startsWith("/scan/new") && (
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line/60 bg-bg/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {[nav[0], { href: "/scan/new", label: "New scan", icon: Icon.scan }, nav[1]].map((n) => (
          <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${active(n.href) ? "text-ink" : "text-faint"}`}>
            {n.href === "/scan/new" ? <span className="-mt-1 grid h-9 w-9 place-items-center rounded-full bg-paper text-bg">{n.icon}</span> : n.icon}
            {n.label}
          </Link>
        ))}
      </nav>
      )}
    </div>
  );
}

export function Loading() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="h-10 w-64 animate-pulse rounded-xl bg-surface" />
      <div className="h-64 animate-pulse rounded-3xl bg-surface" />
    </div>
  );
}
