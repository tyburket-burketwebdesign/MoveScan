import { describe, expect, it } from "vitest";
import { billingSummary, generateInvoices, mrr, nextBillDate, type Subscription } from "./billing";
import { athleteFees, platformBill, processingFee } from "./plans";
import { RALEIGH_FAILS } from "./seed";
import { blankLog, compliance, fromTemplate, indexLogs, mergeLibrary, missedInRow, programFromScan, sessionsFor, STARTER_LIBRARY, streak, TEMPLATES, type Assignment } from "./training";
import { addDays, addMonths, mondayOf, weekdayOf } from "./types";

describe("dates", () => {
  it("adds days across a daylight saving change without drifting", () => {
    expect(addDays("2027-03-10", 7)).toBe("2027-03-17");
    expect(addDays("2026-10-30", 7)).toBe("2026-11-06");
  });
  it("clamps month ends", () => {
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2026-11-14", 2)).toBe("2027-01-14");
  });
  it("knows the week", () => {
    expect(weekdayOf("2026-11-14")).toBe(5); // a Saturday
    expect(mondayOf("2026-11-14")).toBe("2026-11-09");
  });
});

describe("per-athlete pricing", () => {
  it("is graduated: 25 at 5.99, the next 75 at 3.99, then 2.49", () => {
    expect(athleteFees(0)).toBe(0);
    expect(athleteFees(1)).toBe(5.99);
    expect(athleteFees(25)).toBe(149.75);
    expect(athleteFees(26)).toBe(153.74);
    expect(athleteFees(100)).toBe(449);
    expect(athleteFees(101)).toBe(451.49);
  });
  it("adds the flat Pro fee", () => {
    expect(platformBill(40, "core").total).toBe(209.6);
    expect(platformBill(40, "pro").total).toBe(308.6);
  });
  it("splits a payment into processor and platform fees", () => {
    expect(processingFee(400)).toEqual({ processor: 11.9, platform: 2, total: 13.9, net: 386.1 });
  });
});

describe("training", () => {
  const program = fromTemplate("foundation");
  const a: Assignment = { id: "a1", client_id: "c1", program_id: program.id, program, start: "2026-11-02", weeks: 2, status: "active", created_at: "" };
  const sessions = sessionsFor(a);

  it("every template and corrective exercise exists in the library", () => {
    const keys = new Set(STARTER_LIBRARY.map((x) => x.key));
    for (const t of TEMPLATES) for (const d of t.build()) for (const i of d.items) expect(keys.has(i.exercise), i.exercise).toBe(true);
    expect(new Set(STARTER_LIBRARY.map((x) => x.key)).size).toBe(STARTER_LIBRARY.length);
  });

  it("lays a program out on the calendar", () => {
    expect(sessions.map((s) => s.date)).toEqual(["2026-11-02", "2026-11-04", "2026-11-06", "2026-11-09", "2026-11-11", "2026-11-13"]);
    expect(sessions[3].week).toBe(2);
  });

  it("measures adherence, streak and misses", () => {
    const done = (i: number) => ({ ...blankLog(sessions[i]), completed_at: "x" });
    const logs = indexLogs([done(0), done(2), done(3)]);
    // On the 11th: four sessions are past due (2nd, 4th, 6th, 9th); today's is not counted until finished.
    expect(compliance(sessions, logs, "2026-11-11")).toEqual({ scheduled: 4, completed: 3, pct: 75 });
    expect(streak(sessions, logs, "2026-11-11")).toBe(2);
    expect(missedInRow(sessions, logs, "2026-11-14")).toBe(2);
  });

  it("builds an editable program from a scan", () => {
    const p = programFromScan(RALEIGH_FAILS, undefined, "Mason");
    expect(p.days.map((d) => d.weekday)).toEqual([0, 2, 4]);
    expect(p.days[0].items.length).toBe(11);
    expect(p.days[0].items[0].id).not.toBe(p.days[1].items[0].id);
  });

  it("lets a gym override a starter exercise with its own video", () => {
    const lib = mergeLibrary([{ id: "s_bench", key: "s_bench", name: "Bench press", category: "Strength", cue: "mine", videoUrl: "https://example.com/v.mp4" }]);
    expect(lib.length).toBe(STARTER_LIBRARY.length);
    expect(lib.find((x) => x.key === "s_bench")!.videoUrl).toBe("https://example.com/v.mp4");
  });
});

describe("billing", () => {
  const sub: Subscription = { id: "s1", client_id: "c1", plan_id: "p", name: "3 sessions a week", price: 390, interval: "month", start: "2026-09-14", status: "active", resume_from: null };

  it("invoices each started period exactly once", () => {
    const first = generateInvoices([sub], [], "2026-11-14");
    expect(first.map((i) => i.issued)).toEqual(["2026-09-14", "2026-10-14", "2026-11-14"]);
    expect(first.map((i) => i.number)).toEqual([1, 2, 3]);
    expect(first[0].due).toBe("2026-09-19");
    expect(generateInvoices([sub], first, "2026-11-14")).toEqual([]);
    expect(generateInvoices([sub], first, "2026-12-14").map((i) => i.number)).toEqual([4]);
  });

  it("skips paused members and periods before a resume", () => {
    expect(generateInvoices([{ ...sub, status: "paused" }], [], "2026-11-14")).toEqual([]);
    expect(generateInvoices([{ ...sub, resume_from: "2026-11-01" }], [], "2026-11-14").map((i) => i.issued)).toEqual(["2026-11-14"]);
  });

  it("can pass the athlete fee through as its own line", () => {
    const [inv] = generateInvoices([sub], [], "2026-09-14", { athleteFee: 5.99 });
    expect(inv.lines.length).toBe(2);
    expect(inv.total).toBe(395.99);
  });

  it("reports recurring revenue and what is owed", () => {
    const weekly: Subscription = { ...sub, id: "s2", price: 60, interval: "week" };
    expect(mrr([sub, weekly, { ...sub, id: "s3", status: "canceled" }])).toBe(650);
    expect(nextBillDate(sub, "2026-11-14")).toBe("2026-12-14");
    const invs = generateInvoices([sub], [], "2026-11-14");
    invs[0] = { ...invs[0], status: "paid", paid_at: "2026-11-02" };
    const s = billingSummary([sub], invs, "2026-11-20");
    expect(s).toMatchObject({ mrr: 390, collected: 390, outstanding: 780, overdue: 780, overdueCount: 2 });
  });
});
