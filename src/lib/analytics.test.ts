import { describe, expect, it } from "vitest";
import { funnel, median, replies, responseBySource, weekStart, weeklyApplied } from "./analytics.ts";

const ev = (applicationId: number, toStage: string, at: string) => ({ applicationId, toStage, at: `${at}T10:00:00.000Z` });

const events = [
  ev(1, "applied", "2026-11-02"), ev(1, "screening", "2026-11-05"), ev(1, "offer", "2026-11-20"),
  ev(2, "applied", "2026-11-03"), ev(2, "rejected", "2026-11-13"),
  ev(3, "applied", "2026-11-10"), ev(3, "ghosted", "2026-11-18"),
  ev(4, "wishlist", "2026-11-11"),
];

describe("funnel", () => {
  it("counts the furthest stage reached and treats skipped stages as passed", () => {
    const rows = funnel(events);
    expect(rows.map((r) => [r.stage, r.reached])).toEqual([["applied", 3], ["screening", 1], ["interview", 1], ["offer", 1]]);
    expect(rows[0].conversion).toBeNull();
    expect(rows[1].conversion).toBeCloseTo(1 / 3);
    expect(rows[3].conversion).toBe(1);
  });
  it("leaves conversion empty when the previous stage is empty", () => {
    expect(funnel([ev(1, "wishlist", "2026-11-01")]).every((r) => r.reached === 0 && r.conversion === null)).toBe(true);
  });
});

describe("replies", () => {
  it("measures days from applying to the first reply; rejection counts, ghosting does not", () => {
    const byId = Object.fromEntries(replies(events).map((r) => [r.applicationId, r.days]));
    expect(byId).toEqual({ 1: 3, 2: 10, 3: null });
  });
});

describe("responseBySource", () => {
  it("groups by source with rate and median reply time", () => {
    const apps = [{ id: 1, source: "Referral" }, { id: 2, source: "LinkedIn" }, { id: 3, source: "LinkedIn" }, { id: 4, source: "" }];
    expect(responseBySource(apps, events)).toEqual([
      { source: "LinkedIn", applied: 2, replied: 1, rate: 0.5, medianDays: 10 },
      { source: "Referral", applied: 1, replied: 1, rate: 1, medianDays: 3 },
    ]);
  });
});

describe("weekly", () => {
  it("finds the Monday of the week", () => {
    expect(weekStart(new Date("2026-11-22T12:00:00Z"))).toBe("2026-11-16"); // Sunday
    expect(weekStart(new Date("2026-11-16T00:00:00Z"))).toBe("2026-11-16");
  });
  it("buckets applied events into the last N weeks", () => {
    const rows = weeklyApplied(events, new Date("2026-11-22T12:00:00Z"), 3);
    expect(rows).toEqual([{ week: "2026-11-02", count: 2 }, { week: "2026-11-09", count: 1 }, { week: "2026-11-16", count: 0 }]);
  });
  it("median", () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});
