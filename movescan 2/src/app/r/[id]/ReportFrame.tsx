import { Mark } from "@/components/AppShell";
import { PrintButton } from "./PrintButton";

export function ReportFrame({ gymName, children }: { gymName: string | null; children: React.ReactNode }) {
  return (
    <div className="theme-light min-h-dvh">
      <header className="border-b border-hair bg-white">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-8">
          <span className="text-[17px] font-semibold tracking-[-0.02em]">{gymName ?? "MoveScan"}</span>
          <span className="flex items-center gap-4">
            <PrintButton />
            <span className="hidden items-center gap-2 text-xs text-faint sm:flex">
              <Mark size={18} /> Scanned with MoveScan
            </span>
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 pb-20 pt-10 sm:px-8 sm:pt-14">{children}</main>
    </div>
  );
}
