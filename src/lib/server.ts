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

export const smsEnabled = () =>
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);

export async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: process.env.TWILIO_FROM_NUMBER!, Body: body }),
  });
  if (!res.ok) throw new Error(`Text failed: ${await res.text()}`);
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function emailShell(inner: string) {
  return `<div style="background:#13102a;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#eeecf8">
  <div style="max-width:520px;margin:0 auto;background:#1b1737;border:1px solid #322c5c;border-radius:16px;padding:28px">
    <div style="font-size:15px;font-weight:800;color:#eeecf8;margin-bottom:20px">${esc(GYM_NAME)}</div>
    ${inner}
  </div></div>`;
}
