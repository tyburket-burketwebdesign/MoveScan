import { describe, expect, it } from "vitest";
import { scoreScan } from "./scoring";
import { CARSON_FAILS, RALEIGH_FAILS } from "./seed";

const pct = (n: number | null) => Number(n!.toFixed(2));

describe("scoring matches Ambrose's spreadsheet", () => {
  it("Raleigh", () => {
    const s = scoreScan({ fails: RALEIGH_FAILS });
    expect(pct(s.total.pct)).toBe(56.67);
    expect(pct(s.right.pct)).toBe(50);
    expect(pct(s.left.pct)).toBe(50);
    expect(pct(s.synergistic.pct)).toBe(83.33);
    expect(s.movements.map((m) => pct(m.score.pct))).toEqual([62.5, 100, 40, 0, 50, 50]);
  });

  it("Carson", () => {
    const s = scoreScan({ fails: CARSON_FAILS });
    expect(pct(s.total.pct)).toBe(53.33);
    expect(pct(s.right.pct)).toBe(45.83);
    expect(pct(s.left.pct)).toBe(45.83);
    expect(pct(s.synergistic.pct)).toBe(83.33);
    expect(s.movements.map((m) => pct(m.score.pct))).toEqual([68.75, 64.29, 30, 12.5, 50, 75]);
  });

  it("battery has 60 slots: 24 right, 24 left, 12 whole body", () => {
    const s = scoreScan({ fails: [] });
    expect([s.total.possible, s.right.possible, s.left.possible, s.synergistic.possible]).toEqual([60, 24, 24, 12]);
    expect(s.total.pct).toBe(100);
  });

  it("skipped movements drop out instead of counting as fails", () => {
    const s = scoreScan({ fails: [], skipped: ["shoulder"] });
    expect(s.total.possible).toBe(52);
    expect(s.movements.find((m) => m.key === "shoulder")!.score.pct).toBeNull();
  });
});
