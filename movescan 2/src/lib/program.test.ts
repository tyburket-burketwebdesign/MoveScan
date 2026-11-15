import { describe, expect, it } from "vitest";
import { DEFAULT_BATTERY } from "./battery";
import { buildProgram, DEFAULT_MAPPING, EX_BY_KEY } from "./program";
import { RALEIGH_FAILS } from "./seed";

describe("program engine", () => {
  it("every compensation in the battery maps to real exercises", () => {
    for (const m of DEFAULT_BATTERY)
      for (const c of m.compensations) {
        expect(DEFAULT_MAPPING[c.key], c.key).toBeDefined();
        for (const k of DEFAULT_MAPPING[c.key]) expect(EX_BY_KEY[k], k).toBeDefined();
      }
  });

  it("builds a phased, capped program from a real scan", () => {
    const p = buildProgram(RALEIGH_FAILS);
    expect(p.phases.map((x) => x.phase.key)).toEqual(["release", "mobilize", "activate", "integrate"]);
    expect(p.count).toBeLessThanOrEqual(11);
    // Calf release fixes two of Raleigh's foot compensations, so it ranks first.
    expect(p.phases[0].items[0].exercise.key).toBe("r_calf");
  });

  it("a clean scan gets no program", () => {
    expect(buildProgram([]).count).toBe(0);
  });
});
