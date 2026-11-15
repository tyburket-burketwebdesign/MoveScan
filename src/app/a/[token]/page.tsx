"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AthleteApp from "@/components/athlete/AthleteApp";
import { Mark } from "@/components/AppShell";
import { loadPortal, type PortalBundle } from "@/lib/portal";

// The athlete's own app, opened from their private link.
function Portal() {
  const { token } = useParams<{ token: string }>();
  const tab = useSearchParams().get("tab");
  const [bundle, setBundle] = useState<PortalBundle | null | undefined>(undefined);
  useEffect(() => {
    loadPortal(token).then(setBundle).catch(() => setBundle(null));
  }, [token]);

  if (bundle === undefined)
    return (
      <div className="grid min-h-dvh place-items-center bg-[#0b0c0e]">
        <span className="animate-pulse">
          <Mark size={56} />
        </span>
      </div>
    );
  if (bundle === null)
    return (
      <div className="grid min-h-dvh place-items-center bg-[#0b0c0e] px-8 text-center">
        <div>
          <Mark size={48} />
          <h1 className="title mt-6 text-3xl">This link doesn&apos;t work</h1>
          <p className="mt-3 text-dim">Ask your trainer to send your app link again.</p>
        </div>
      </div>
    );
  return <AthleteApp token={token} initial={bundle} startTab={tab === "account" || tab === "training" || tab === "scan" ? tab : undefined} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Portal />
    </Suspense>
  );
}
