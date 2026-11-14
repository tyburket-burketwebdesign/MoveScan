import ResultsView from "@/components/ResultsView";
import { Logo } from "@/components/AppShell";
import { admin, GYM_NAME } from "@/lib/server";
import type { Scan } from "@/lib/types";
import DemoReport from "./DemoReport";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your movement scan", robots: { index: false } };

// The client-facing report. The scan id is an unguessable UUID, and only the first name is shown.
export default async function Report({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = admin();

  let body: React.ReactNode;
  if (!db) {
    body = <DemoReport id={id} />;
  } else {
    const ok = /^[0-9a-f-]{36}$/i.test(id);
    const { data: scan } = ok ? await db.from("scans").select("*, clients(first_name)").eq("id", id).maybeSingle() : { data: null };
    if (!scan) {
      body = (
        <div className="surface p-8">
          <p className="wide text-xl font-bold">This report link doesn&apos;t work</p>
          <p className="mt-2 text-dim">Ask your trainer to send it again.</p>
        </div>
      );
    } else {
      const { data: prev } = await db
        .from("scans")
        .select("*")
        .eq("client_id", scan.client_id)
        .lt("performed_at", scan.performed_at)
        .order("performed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { clients, ...s } = scan as Scan & { clients: { first_name: string } };
      body = <ResultsView scan={s} name={clients.first_name} previous={prev as Scan | null} gymName={GYM_NAME !== "MoveScan" ? GYM_NAME : undefined} />;
    }
  }

  return (
    <div className="min-h-dvh pb-16">
      <header className="border-b border-line/60">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-4 sm:px-6">
          {GYM_NAME !== "MoveScan" ? <span className="display text-lg">{GYM_NAME}</span> : <Logo />}
          {GYM_NAME !== "MoveScan" && <span className="text-xs text-faint">Scanned with MoveScan</span>}
        </div>
      </header>
      <main className="mx-auto max-w-[1180px] px-4 pt-8 sm:px-6">{body}</main>
    </div>
  );
}
