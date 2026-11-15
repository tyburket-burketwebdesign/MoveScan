import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only helpers. The service role key bypasses row level security, so it is never sent to the browser.
export function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export const GYM_NAME = process.env.GYM_NAME || "MoveScan";
export const FROM_EMAIL = process.env.REPORT_FROM_EMAIL || "MoveScan <onboarding@resend.dev>";
export const BOOKING_URL = process.env.BOOKING_URL || null;

export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Email isn't connected yet (RESEND_API_KEY is not set).");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html, reply_to: process.env.REPLY_TO_EMAIL || undefined }),
  });
  if (!res.ok) throw new Error(`Email failed: ${await res.text()}`);
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function emailShell(inner: string) {
  return `<div style="background:#121417;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#eceef0">
  <div style="max-width:520px;margin:0 auto;background:#191c20;border:1px solid #2a2f35;border-radius:16px;padding:28px">
    <div style="font-size:15px;font-weight:800;color:#eceef0;margin-bottom:20px">${esc(GYM_NAME)}</div>
    ${inner}
  </div></div>`;
}
