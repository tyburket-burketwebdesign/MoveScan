"use client";

import type { Program } from "@/lib/program";

// The corrective program, grouped by phase. Used by the trainer's results screen and the athlete report.
export default function ProgramView({ program, compact = false }: { program: Program; compact?: boolean }) {
  if (program.count === 0)
    return <p className="text-ice">No compensations found, so there&apos;s nothing to correct. Keep training.</p>;
  return (
    <ol className="grid gap-x-10 gap-y-8 md:grid-cols-2">
      {program.phases.map(({ phase, items }, pi) => (
        <li key={phase.key}>
          <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-hair pb-2">
            <h3 className="font-semibold">
              <span className="mr-2 text-faint">{pi + 1}</span>
              {phase.label}
            </h3>
            <span className="text-sm text-dim">{phase.dose}</span>
          </div>
          <ul className="space-y-3">
            {items.map(({ exercise, targets }) => (
              <li key={exercise.key}>
                <p className="font-medium">{exercise.name}</p>
                {!compact && <p className="text-sm text-dim">{exercise.cue}</p>}
                <p className="mt-0.5 text-xs text-faint">For {targets.join(", ").toLowerCase()}</p>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
