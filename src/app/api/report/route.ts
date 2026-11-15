import { NextResponse } from "next/server";
import { admin, emailShell, esc, sendEmail } from "@/lib/server";

type Body = {
  to: string | null;
  name: string;
  clientName: string;
  link: string;
  total: number;
  movements: { label: string; pct: number | null; skipped: boolean }[];
  retestDue: string;
};

export async function POST(req: Request) {
  // In live mode only signed-in gym staff may send. In demo mode there is no database to check against.
  const db = admin();
  if (db) {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    const { data } = token ? await db.auth.getUser(token) : { data: { user: null } };
    if (!data.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const b = (await req.json()) as Body;
  // Only send links that point back at this app.
  const origin = new URL(req.url).origin;
  if (!b.link?.startsWith(`${origin}/r/`)) return NextResponse.json({ error: "Bad report link." }, { status: 400 });

  const sent: string[] = [];
  const due = new Date(b.retestDue + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const rows = b.movements
    .map(
      (m) =>
        `<tr><td style="padding:6px 0;color:#9aa1a9">${esc(m.label)}</td><td style="padding:6px 0;text-align:right;font-family:monospace">${
          m.skipped ? "skipped" : `${Math.round(m.pct ?? 0)}%`
        }</td></tr>`,
    )
    .join("");

  try {
    if (b.to) {
      await sendEmail(
        b.to,
        `${b.clientName}'s movement scan results`,
        emailShell(`
        <h1 style="margin:0 0 8px;font-size:22px">Hi ${esc(b.name)},</h1>
        <p style="color:#9aa1a9;margin:0 0 20px">Here are ${esc(b.clientName)}'s movement efficiency results from today.</p>
        <div style="text-align:center;margin:24px 0">
          <div style="font-size:14px;color:#9aa1a9">Movement efficiency</div>
          <div style="font-size:48px;font-weight:700;color:#8fd5ff">${Math.round(b.total)}%</div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
        <div style="text-align:center;margin:28px 0 8px">
          <a href="${esc(b.link)}" style="background:#f5f6f7;color:#121417;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:700">See the full body map</a>
        </div>
        <p style="color:#9aa1a9;font-size:13px;margin-top:24px">Next retest: <b style="color:#eceef0">${due}</b>. We'll send a reminder when it's close.</p>`),
      );
      sent.push(b.to);
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Send failed" }, { status: 500 });
  }

  if (sent.length === 0) return NextResponse.json({ error: "There's no email on file for this athlete." }, { status: 400 });
  return NextResponse.json({ sent });
}
