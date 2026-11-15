"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { BRAND } from "@/lib/brand";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { isLive, resetDemo, supabase } from "@/lib/store";
import { useSettings } from "@/lib/useSettings";

// The mark: a forged T driven to a point, glowing from white-hot at the crown down to red.
export function Mark({ size = 30 }: { size?: number }) {
  const gid = `mark-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4cf" />
          <stop offset="0.28" stopColor="#ffb648" />
          <stop offset="0.6" stopColor="#ff5a3a" />
          <stop offset="1" stopColor="#c4246f" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="#0a0b0d" />
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="14.25" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" />
      <path d="M11 19.5 16.5 14h31l5.5 5.5V28H38.5v17L32 54.5 25.5 45V28H11Z" fill={`url(#${gid})`} />
    </svg>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="flex items-center gap-3">
      <Mark size={size} />
      <span className="text-[15px] font-bold uppercase tracking-[0.24em]">{BRAND.name}</span>
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
  training: "M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11",
  billing: "M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5ZM3 10h18M7 15h3",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z",
  plus: "M12 5v14M5 12h14",
  phone: "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM11 18h2",
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

  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/scan") : path.startsWith(href));
  const nav = [
    { href: "/", label: "Today", icon: ICONS.today },
    { href: "/clients", label: "Athletes", icon: ICONS.athletes },
    { href: "/training", label: "Training", icon: ICONS.training },
    { href: "/billing", label: "Billing", icon: ICONS.billing },
    { href: "/settings", label: "Settings", icon: ICONS.settings },
  ];
  const plan = PLANS.find((p) => p.key === settings?.plan);
  const trialLeft = settings?.planStartedAt ? Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - new Date(settings.planStartedAt).getTime()) / 864e5)) : null;
  const inScan = path.startsWith("/scan/new");

  return (
    <div className="min-h-dvh md:pl-[248px]">
      <aside
        className="no-print fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-hair bg-[#0e1012] px-4 pb-4 md:flex"
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
              className={`relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] transition-colors ${active(n.href) ? "bg-white/[0.06] text-ink" : "text-dim hover:text-ink"}`}
            >
              {active(n.href) && <span className="absolute -left-4 bottom-2 top-2 w-[2px] rounded-full bg-paper" />}
              <I d={n.icon} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex-1" />
        {!isLive && (
          <a href="/a/demo" target="_blank" rel="noreferrer" className="mb-3 flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] text-dim hover:text-ink">
            <I d={ICONS.phone} />
            See the athlete app
          </a>
        )}
        <Link href="/settings#plan" className="rounded-[14px] border border-hair p-3.5 transition-colors hover:bg-white/[0.03]">
          <p className="truncate text-sm font-medium">{settings?.gymName ?? " "}</p>
          <p className="mt-0.5 text-xs text-dim">{plan ? `${plan.name} plan${trialLeft ? `, ${trialLeft} trial days left` : ""}` : "Choose a plan"}</p>
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
                  if (confirm("Reset the demo back to the sample gym?")) {
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
          <Logo size={26} />
        </Link>
        <Link href="/scan/new" className="btn btn-primary !min-h-9 !px-3.5 text-sm">
          New scan
        </Link>
      </header>

      <main className={`mx-auto max-w-[1200px] px-4 pt-7 sm:px-8 md:px-12 md:pb-20 md:pt-12 ${inScan ? "pb-32" : "pb-28"}`}>{ready ? children : <Loading />}</main>

      {!inScan && (
        <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-hair bg-bg/90 backdrop-blur-xl md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-1 py-2.5 text-[10.5px] ${active(n.href) ? "text-ink" : "text-faint"}`}>
              <I d={n.icon} />
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

export function PageHeader({ eyebrow, title, sub, children }: { eyebrow?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
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
