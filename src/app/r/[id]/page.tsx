import ResultsView from "@/components/ResultsView";
import { admin } from "@/lib/server";
import type { Scan } from "@/lib/types";
import DemoReport from "./DemoReport";
import { ReportFrame } from "./ReportFrame";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your movement scan", robots: { index: false } };

// The athlete-facing report: light clinical theme, the gym's name up top, results and program.
// The scan id is an unguessable UUID, and only the athlete's first name is shown.
export default async function Report({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = admin();
  if (!db) return <DemoReport id={id} />;

  const ok = /^[0-9a-f-]{36}$/i.test(id);
  const { data: scan } = ok ? await db.from("scans").select("*, clients(first_name), gyms(name, settings)").eq("id", id).maybeSingle() : { data: null };
  if (!scan)
    return (
      <ReportFrame gymName={null}>
        <div className="surface p-10">
          <p className="text-xl font-semibold">This report link doesn&apos;t work</p>
          <p className="mt-2 text-dim">Ask your trainer to send it again.</p>
        </div>
      </ReportFrame>
    );

  const { data: prev } = await db
    .from("scans")
    .select("*")
    .eq("client_id", scan.client_id)
    .lt("performed_at", scan.performed_at)
    .order("performed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { clients, gyms, ...s } = scan as Scan & { clients: { first_name: string }; gyms: { name: string; settings: { mapping?: Record<string, string[]> } } };
  return (
    <ReportFrame gymName={gyms?.name ?? null}>
      <ResultsView scan={s} name={clients.first_name} previous={prev as Scan | null} mapping={gyms?.settings?.mapping} theme="light" audience="athlete" />
    </ReportFrame>
  );
}
