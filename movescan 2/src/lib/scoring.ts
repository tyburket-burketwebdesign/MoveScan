import { DEFAULT_BATTERY, type Movement, type Region } from "./battery";

// A failed slot is stored as "movement.compensation.side", where side is R, L or W (whole body).
export type Side = "R" | "L" | "W";
export const slotId = (movement: string, comp: string, side: Side) => `${movement}.${comp}.${side}`;

export interface ScanInput {
  fails: string[];
  skipped?: string[]; // movement keys that were not tested (injury etc.). Their slots drop out of the math.
}

export interface Ratio {
  passed: number;
  possible: number;
  pct: number | null; // null when nothing was tested
}

export interface ScoreResult {
  total: Ratio;
  right: Ratio;
  left: Ratio;
  synergistic: Ratio;
  movements: { key: string; label: string; skipped: boolean; score: Ratio }[];
  regions: Record<Region, { R: Ratio; L: Ratio }>;
}

const ratio = (fails: number, possible: number): Ratio => ({
  passed: possible - fails,
  possible,
  pct: possible === 0 ? null : ((possible - fails) / possible) * 100,
});

// Mirrors the spreadsheet exactly: every slot is pooled, so the total is NOT an average of the
// movement scores. Movements with more slots (the squat has 16) weigh more than small ones (push up has 4).
export function scoreScan(input: ScanInput, battery: Movement[] = DEFAULT_BATTERY): ScoreResult {
  const failSet = new Set(input.fails);
  const skipped = new Set(input.skipped ?? []);
  const tally = { R: [0, 0], L: [0, 0], W: [0, 0] } as Record<Side, [number, number]>; // [fails, possible]
  const regionTally = {} as Record<Region, { R: [number, number]; L: [number, number] }>;
  const movements: ScoreResult["movements"] = [];

  const bumpRegion = (region: Region, side: "R" | "L", failed: boolean) => {
    regionTally[region] ??= { R: [0, 0], L: [0, 0] };
    regionTally[region][side][1] += 1;
    if (failed) regionTally[region][side][0] += 1;
  };

  for (const m of battery) {
    const isSkipped = skipped.has(m.key);
    let fails = 0;
    let possible = 0;
    for (const comp of m.compensations) {
      const sides: Side[] = comp.type === "side" ? ["R", "L"] : ["W"];
      for (const side of sides) {
        const failed = failSet.has(slotId(m.key, comp.key, side));
        if (!isSkipped) {
          possible += 1;
          tally[side][1] += 1;
          if (failed) {
            fails += 1;
            tally[side][0] += 1;
          }
        }
        if (isSkipped) continue;
        // Whole-body compensations light up both sides of their region.
        if (side === "W") {
          bumpRegion(comp.region, "R", failed);
          bumpRegion(comp.region, "L", failed);
        } else {
          bumpRegion(comp.region, side, failed);
        }
      }
    }
    movements.push({ key: m.key, label: m.label, skipped: isSkipped, score: ratio(fails, possible) });
  }

  const totalFails = tally.R[0] + tally.L[0] + tally.W[0];
  const totalPossible = tally.R[1] + tally.L[1] + tally.W[1];

  const regions = {} as ScoreResult["regions"];
  for (const [region, t] of Object.entries(regionTally) as [Region, { R: [number, number]; L: [number, number] }][]) {
    regions[region] = { R: ratio(t.R[0], t.R[1]), L: ratio(t.L[0], t.L[1]) };
  }

  return {
    total: ratio(totalFails, totalPossible),
    right: ratio(tally.R[0], tally.R[1]),
    left: ratio(tally.L[0], tally.L[1]),
    synergistic: ratio(tally.W[0], tally.W[1]),
    movements,
    regions,
  };
}

// Which compensations failed, grouped for display (e.g. region drill-down on the heatmap).
export function failedCompensations(fails: string[], battery: Movement[] = DEFAULT_BATTERY) {
  const out: { movement: string; compensation: string; side: Side; region: Region }[] = [];
  for (const id of fails) {
    const [mk, ck, side] = id.split(".") as [string, string, Side];
    const m = battery.find((x) => x.key === mk);
    const comp = m?.compensations.find((x) => x.key === ck);
    if (m && comp) out.push({ movement: m.label, compensation: comp.label, side, region: comp.region });
  }
  return out;
}

export const fmtPct = (r: Ratio | number | null, digits = 0) => {
  const v = typeof r === "number" || r === null ? r : r.pct;
  return v === null ? "n/a" : `${v.toFixed(digits)}%`;
};
