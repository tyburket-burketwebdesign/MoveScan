import ResultsView from "@/components/ResultsView";
import { Logo } from "@/components/AppShell";
import { admin } from "@/lib/server";
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
      body = <p className="text-dim">This report link isn&apos;t valid.</p>;
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
      body = <ResultsView scan={s} name={clients.first_name} previous={prev as Scan | null} />;
    }
  }

  return (
    <div className="min-h-dvh pb-16">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
          <Logo />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-6">{body}</main>
    </div>
  );
}
