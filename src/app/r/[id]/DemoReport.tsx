"use client";

import { useEffect, useState } from "react";
import ResultsView from "@/components/ResultsView";
import { store } from "@/lib/store";
import type { Scan } from "@/lib/types";

export default function DemoReport({ id }: { id: string }) {
  const [data, setData] = useState<{ scan: Scan; name: string; prev: Scan | null } | null | undefined>(undefined);
  useEffect(() => {
    (async () => {
      const scan = await store.getScan(id);
      if (!scan) return setData(null);
      const c = await store.getClient(scan.client_id);
      const hist = await store.listScans(scan.client_id);
      setData({ scan, name: c?.first_name ?? "", prev: hist.find((h) => h.performed_at < scan.performed_at) ?? null });
    })();
  }, [id]);
  if (data === undefined) return <p className="text-dim">Loading…</p>;
  if (data === null) return <p className="text-dim">This report isn&apos;t available on this device.</p>;
  return <ResultsView scan={data.scan} name={data.name} previous={data.prev} />;
}
