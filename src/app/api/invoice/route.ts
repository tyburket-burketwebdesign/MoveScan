import { NextResponse } from "next/server";
import { emailShell, esc, requireStaff, sendEmail } from "@/lib/server";

type Body = { to: string; name: string; gym: string; number: string; total: number; due: string; lines: { label: string; amount: number }[]; link: string };
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

// Email an invoice to an athlete (or their parent) with a link to view and pay it in their app.
export async function POST(req: Request) {
  if (!(await requireStaff(req))) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const b = (await req.json()) as Body;
  const origin = new URL(req.url).origin;
  if (!b.to || !b.link?.startsWith(`${origin}/a/`)) return NextResponse.json({ error: "That invoice can't be sent." }, { status: 400 });

  const due = new Date(b.due + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const rows = b.lines.map((l) => `<tr><td style="padding:8px 0;color:#9aa1a9">${esc(l.label)}</td><td style="padding:8px 0;text-align:right">${usd(l.amount)}</td></tr>`).join("");
  try {
    await sendEmail(
      b.to,
      `Invoice ${b.number} from ${b.gym}`,
      emailShell(
        `<h1 style="margin:0 0 8px;font-size:22px">Hi ${esc(b.name)},</h1>
        <p style="color:#9aa1a9;margin:0 0 20px">Here's your invoice from ${esc(b.gym)}.</p>
        <div style="text-align:center;margin:24px 0">
          <div style="font-size:14px;color:#9aa1a9">Due ${due}</div>
          <div style="font-size:44px;font-weight:300;color:#eceef0">${usd(b.total)}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;border-top:1px solid #2a2f35">${rows}</table>
        <div style="text-align:center;margin:28px 0 8px">
          <a href="${esc(b.link)}" style="background:#f5f6f7;color:#121417;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:700">View and pay</a>
        </div>`,
        b.gym,
      ),
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "The invoice didn't send." }, { status: 500 });
  }
  return NextResponse.json({ sent: b.to });
}
