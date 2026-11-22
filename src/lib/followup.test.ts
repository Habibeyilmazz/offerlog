import { describe, expect, it } from "vitest";
import { openDb } from "../db/index.ts";
import { addNote, createApplication, lastActivity, listApplications, moveApplication, updateApplication } from "./data.ts";
import { onDay } from "./format.ts";
import { waitingOnReply } from "./followup.ts";
import { parseApplication } from "./validate.ts";

const at = (day: string) => onDay("2026-01-01T12:00:00.000Z", day);

function setup() {
  const d = openDb(":memory:");
  const add = (company: string, stage: string, day: string) => {
    const r = parseApplication({ company, role: "Dev", stage });
    if (!r.ok) throw new Error(r.error);
    return createApplication(d, r.value, at(day));
  };
  return { d, add, waiting: (todayIso: string) => waitingOnReply(listApplications(d), lastActivity(d), todayIso).map((w) => [w.app.company, w.days]) };
}

describe("waiting on a reply", () => {
  it("lists applied, screening and interview stages after 14 quiet days, longest first", () => {
    const { add, waiting } = setup();
    add("Fresh", "applied", "2026-11-10");
    add("Edge", "applied", "2026-11-08");
    add("Old", "screening", "2026-10-01");
    for (const stage of ["wishlist", "offer", "rejected", "ghosted"]) add(stage, stage, "2026-09-01");
    expect(waiting("2026-11-22")).toEqual([["Old", 52], ["Edge", 14]]);
  });

  it("restarts the clock on a stage change or a timeline note, not on a prep note", () => {
    const { d, add, waiting } = setup();
    const moved = add("Moved", "applied", "2026-10-01");
    moveApplication(d, moved, "interview", at("2026-11-15"));
    const noted = add("Noted", "applied", "2026-10-01");
    addNote(d, noted, "Emailed the recruiter", null, at("2026-11-20"));
    const prepped = add("Prepped", "applied", "2026-10-01");
    addNote(d, prepped, "Read up on their stack", "screening", at("2026-11-20"));
    expect(waiting("2026-11-22")).toEqual([["Prepped", 52]]);
  });

  it("leaves out applications with a dated next step, which Up next already shows", () => {
    const { d, add, waiting } = setup();
    const dated = add("Dated", "applied", "2026-10-01");
    updateApplication(d, dated, { nextStep: "Call", nextStepDue: "2026-11-30" });
    const undated = add("Undated", "applied", "2026-10-01");
    updateApplication(d, undated, { nextStep: "Wait for them" });
    expect(waiting("2026-11-22")).toEqual([["Undated", 52]]);
  });
});
