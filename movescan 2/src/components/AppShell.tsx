"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { isLive, resetDemo, supabase } from "@/lib/store";
import { useSettings } from "@/lib/useSettings";

export function Mark({ size = 26 }: { size?: number }) {
  // Unique gradient id per instance: a hidden copy can't own a shared one.
  const gid = `mark-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <radialGradient id={gid} cx="64%" cy="36%" r="72%">
          <stop offset="0" stopColor="#ffe28c" />
          <stop offset="0.32" stopColor="#ff7a2f" />
          <stop offset="0.62" stopColor="#e8367a" />
          <stop offset="1" stopColor="#3a1f86" />
        </radialGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gid})`} />
      <path d="M6 17h5l3-7 4 13 3-6h5" fill="none" stroke="#121417" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ sub }: { sub?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <Mark />
      <span className="leading-tight">
        <span className="block text-[17px] font-semibold tracking-[-0.02em]">MoveScan</span>
        {sub && <span className="block text-xs text-dim">{sub}</span>}
      </span>
    </span>
  );
}

const I = ({ d }: { d: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const ICONS = {
  today: "M3 12h4l3-8 4 16 3-8h4",
  athletes: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21c.6-3.8 3.4-6 7-6s6.4 2.2 7 6M16 3.5a4 4 0 0 1 0 7.5M18.5 15c2 .8 3.1 2.8 3.5 6",
  library: "M4 5h6v15H4zM14 5h6v15h-6zM7 9h0M17 9h0",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z",
  plus: "M12 5v14M5 12h14",
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(!isLive);
  const { settings } = useSettings();

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
    { href: "/", label: "Today", icon: ICONS.today },
    { href: "/clients", label: "Athletes", icon: ICONS.athletes },
    { href: "/library", label: "Programs", icon: ICONS.library },
    { href: "/settings", label: "Settings", icon: ICONS.settings },
  ];
  const plan = PLANS.find((p) => p.key === settings?.plan);
  const trialLeft = settings?.planStartedAt ? Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - new Date(settings.planStartedAt).getTime()) / 864e5)) : null;
  const inScan = path.startsWith("/scan/new");

  return (
    <div className="min-h-dvh md:pl-[248px]">
      <aside
        className="no-print fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-hair bg-[#0f1113] px-4 pb-4 md:flex"
        style={{ paddingTop: "max(1.75rem, env(safe-area-inset-top))" }}
      >
        <Link href="/" className="mb-9 px-2">
          <Logo />
        </Link>
        <Link href="/scan/new" className="btn btn-primary mb-7 w-full">
          <I d={ICONS.plus} /> New scan
        </Link>
        <nav className="flex flex-col gap-0.5">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] transition-colors ${
                active(n.href) ? "bg-white/[0.06] text-ink" : "text-dim hover:text-ink"
              }`}
            >
              {active(n.href) && <span className="absolute -left-4 top-2 bottom-2 w-[2px] rounded-full bg-paper" />}
              <I d={n.icon} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex-1" />
        <Link href="/settings#plan" className="rounded-[14px] border border-hair p-3.5 transition-colors hover:bg-white/[0.03]">
          <p className="truncate text-sm font-medium">{settings?.gymName ?? " "}</p>
          <p className="mt-0.5 text-xs text-dim">
            {plan ? `${plan.name} plan${trialLeft !== null && trialLeft > 0 ? `, ${trialLeft} days left in trial` : ""}` : "Choose a plan"}
          </p>
        </Link>
        <div className="mt-3 flex items-center justify-between px-1 text-xs text-faint">
          {isLive ? (
            <button
              className="hover:text-ink"
              onClick={async () => {
                await supabase().auth.signOut();
                router.replace("/login");
              }}
            >
              Sign out
            </button>
          ) : (
            <>
              <span>Demo data</span>
              <button
                className="hover:text-ink"
                onClick={() => {
                  if (confirm("Reset the demo data back to the sample athletes?")) {
                    resetDemo();
                    location.href = "/";
                  }
                }}
              >
                Reset
              </button>
            </>
          )}
        </div>
      </aside>

      <header
        className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-hair bg-bg/85 px-4 backdrop-blur-xl md:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)", height: "calc(3.5rem + env(safe-area-inset-top))" }}
      >
        <Link href="/">
          <Logo />
        </Link>
        {!isLive && <span className="text-xs text-faint">Demo data</span>}
      </header>

      <main className={`mx-auto max-w-[1200px] px-4 pt-7 sm:px-8 md:px-12 md:pb-20 md:pt-12 ${inScan ? "pb-32" : "pb-28"}`}>{ready ? children : <Loading />}</main>

      {!inScan && (
        <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-hair bg-bg/90 backdrop-blur-xl md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {[nav[0], nav[1], { href: "/scan/new", label: "Scan", icon: ICONS.plus }, nav[2], nav[3]].map((n) => (
            <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-1 py-2.5 text-[10.5px] ${active(n.href) ? "text-ink" : "text-faint"}`}>
              {n.href === "/scan/new" ? (
                <span className="-mt-0.5 grid h-8 w-8 place-items-center rounded-[10px] bg-paper text-bg">
                  <I d={n.icon} />
                </span>
              ) : (
                <I d={n.icon} />
              )}
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
    <div className="space-y-5" aria-busy>
      <div className="h-12 w-72 animate-pulse rounded-xl bg-surface" />
      <div className="h-72 animate-pulse rounded-[18px] bg-surface" />
    </div>
  );
}

export function PageHeader({ eyebrow, title, sub, children }: { eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-0">
        {eyebrow && <p className="mb-3 text-[15px] text-dim">{eyebrow}</p>}
        <h1 className="title text-[2.5rem] sm:text-[3.5rem]">{title}</h1>
        {sub && <p className="mt-3 text-[17px] text-dim">{sub}</p>}
      </div>
      {children && <div className="no-print flex flex-wrap gap-2.5">{children}</div>}
    </header>
  );
}
