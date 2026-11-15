"use client";

import { useEffect, useState } from "react";
import ResultsView from "@/components/ResultsView";
import { store } from "@/lib/store";
import type { GymSettings, Scan } from "@/lib/types";
import { ReportFrame } from "./ReportFrame";

export default function DemoReport({ id }: { id: string }) {
  const [data, setData] = useState<{ scan: Scan; name: string; prev: Scan | null; settings: GymSettings } | null | undefined>(undefined);
  useEffect(() => {
    (async () => {
      const [scan, settings] = await Promise.all([store.getScan(id), store.getSettings()]);
      if (!scan) return setData(null);
      const c = await store.getClient(scan.client_id);
      const hist = await store.listScans(scan.client_id);
      setData({ scan, name: c?.first_name ?? "", prev: hist.find((h) => h.performed_at < scan.performed_at) ?? null, settings });
    })();
  }, [id]);
  return (
    <ReportFrame gymName={data ? data.settings.gymName : null}>
      {data === undefined ? (
        <div className="h-96 animate-pulse rounded-[18px] bg-white" />
      ) : data === null ? (
        <div className="surface p-10">
          <p className="text-xl font-semibold">This report isn&apos;t on this device</p>
          <p className="mt-2 text-dim">In the demo, reports only open on the device that saved them.</p>
        </div>
      ) : (
        <ResultsView scan={data.scan} name={data.name} previous={data.prev} mapping={data.settings.mapping} theme="light" audience="athlete" />
      )}
    </ReportFrame>
  );
}
