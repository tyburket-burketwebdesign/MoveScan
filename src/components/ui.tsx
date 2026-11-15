"use client";

import { useEffect } from "react";
import { initials, type Client } from "@/lib/types";

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, string][]; label?: string }) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-[12px] bg-white/[0.04] p-1" role="tablist" aria-label={label}>
      {options.map(([k, l]) => (
        <button
          key={k}
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={`whitespace-nowrap rounded-[9px] px-4 py-2 text-sm transition-colors ${value === k ? "bg-raised text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" : "text-dim hover:text-ink"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-label={title}>
      <button aria-label="Close" className="fade absolute inset-0 cursor-default bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`sheet relative flex max-h-[92dvh] w-full flex-col rounded-t-[22px] bg-[#1d2125] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_40px_80px_-20px_rgba(0,0,0,0.8)] sm:rounded-[22px] ${wide ? "sm:max-w-2xl" : "sm:max-w-md"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-6">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="-mr-2 grid h-9 w-9 place-items-center rounded-full text-dim hover:bg-white/5 hover:text-ink">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-6 pt-3">{children}</div>
      </div>
    </div>
  );
}

const TONES = {
  neutral: "bg-white/[0.06] text-dim",
  good: "bg-ice/12 text-ice",
  warn: "bg-amber/12 text-amber",
  bad: "bg-hot/12 text-hot",
} as const;
export function Pill({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

export function Avatar({ who, size = 44 }: { who: Pick<Client, "first_name" | "last_name">; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-b from-white/[0.1] to-white/[0.03] font-semibold text-dim shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials(who)}
    </span>
  );
}

export function Field({ label, hint, children, wide }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-2 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-sm text-dim">{label}</span>
      {children}
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </label>
  );
}

// A thin progress ring with something in the middle.
export function Ring({ pct, size = 56, stroke = 4, color = "var(--color-ice)", children }: { pct: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(Math.max(0, Math.min(100, pct)) / 100) * c} ${c}`} style={{ transition: "stroke-dasharray .6s var(--ease-out-expo)" }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center">{children}</span>
    </span>
  );
}

export function Check({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

// ---------- video ----------
// Trainers paste a link. YouTube and Vimeo links are embedded; direct video files play natively.
export function toEmbed(url?: string): { kind: "iframe" | "video"; src: string } | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}` };
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v") ?? u.pathname.match(/\/(shorts|embed)\/([\w-]+)/)?.[2];
      return id ? { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
    }
    if (host.endsWith("vimeo.com")) {
      const id = u.pathname.match(/(\d+)/)?.[1];
      return id ? { kind: "iframe", src: `https://player.vimeo.com/video/${id}` } : null;
    }
    if (/\.(mp4|webm|mov|m4v)$/i.test(u.pathname)) return { kind: "video", src: u.toString() };
    return null;
  } catch {
    return null;
  }
}

export function VideoFrame({ url, title }: { url?: string; title: string }) {
  const e = toEmbed(url);
  if (!e) return null;
  return (
    <div className="aspect-video overflow-hidden rounded-[14px] bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
      {e.kind === "iframe" ? (
        <iframe src={e.src} title={title} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full" />
      ) : (
        <video src={e.src} controls playsInline preload="metadata" className="h-full w-full" />
      )}
    </div>
  );
}
