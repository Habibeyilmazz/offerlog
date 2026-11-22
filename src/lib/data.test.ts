import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "../db/index.ts";
import { createApplication, deleteApplication, getApplication, getWeeklyGoal, listApplications, listEvents, moveApplication, setWeeklyGoal, updateApplication, addNote } from "./data.ts";
import { due, today } from "./format.ts";
import { seedDemo } from "./seed.ts";
import { exportCsv, exportJson, importCsv, importJson } from "./transfer.ts";
import { parseApplication } from "./validate.ts";

const input = (raw: Record<string, unknown>) => {
  const r = parseApplication(raw);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

let d: Db;
beforeEach(() => {
  d = openDb(":memory:");
});

describe("applications", () => {
  it("records stage transitions as events", () => {
    const id = createApplication(d, input({ company: "Acme", role: "Dev", stage: "applied" }), "2026-11-01T00:00:00.000Z");
    expect(moveApplication(d, id, "screening", "2026-11-03T00:00:00.000Z")).toBe(true);
    moveApplication(d, id, "screening", "2026-11-04T00:00:00.000Z"); // no-op move
    updateApplication(d, id, input({ company: "Acme Inc", role: "Dev", stage: "interview" }), "2026-11-05T00:00:00.000Z");
    const detail = getApplication(d, id)!;
    expect(detail.app.company).toBe("Acme Inc");
    expect(detail.events.map((e) => [e.fromStage, e.toStage])).toEqual([[null, "applied"], ["applied", "screening"], ["screening", "interview"]]);
  });
  it("returns false for unknown ids and cascades deletes", () => {
    expect(moveApplication(d, 999, "offer")).toBe(false);
    const id = createApplication(d, input({ company: "A", role: "B" }));
    addNote(d, id, "hello", null);
    deleteApplication(d, id);
    expect(getApplication(d, id)).toBeNull();
    expect(listEvents(d)).toEqual([]);
  });
  it("dates demo next steps in local time", () => {
    const now = new Date(2026, 10, 22, 8); // 08:00 in Auckland is the previous day in UTC
    seedDemo(d, now);
    const app = listApplications(d).find((a) => a.company === "Fernhill Games")!;
    expect(due(app.nextStepDue!, today(now)).label).toBe("Due tomorrow");
  });
  it("stores the weekly goal", () => {
    expect(getWeeklyGoal(d)).toBe(5);
    setWeeklyGoal(d, 8);
    setWeeklyGoal(d, 9);
    expect(getWeeklyGoal(d)).toBe(9);
  });
});

describe("import/export", () => {
  it("round-trips the demo data through JSON", () => {
    seedDemo(d, new Date("2026-11-22T12:00:00Z"));
    const dump = exportJson(d);
    const other = openDb(":memory:");
    expect(importJson(other, JSON.parse(JSON.stringify(dump)))).toEqual({ applications: 18, questions: 7 });
    const again = exportJson(other);
    expect({ ...again, exportedAt: "" }).toEqual({ ...dump, exportedAt: "" });
  });
  it("round-trips CSV and creates an event per row", () => {
    seedDemo(d, new Date("2026-11-22T12:00:00Z"));
    const other = openDb(":memory:");
    expect(importCsv(other, exportCsv(d)).applications).toBe(18);
    expect(exportCsv(other)).toBe(exportCsv(d));
    expect(listEvents(other)).toHaveLength(18);
  });
  it("accepts camelCase headers and strips the formula guard", () => {
    importCsv(d, "Company,Role,Stage,nextStep\nAcme,Dev,applied,'=call\n");
    expect(getApplication(d, 1)!.app.nextStep).toBe("=call");
  });
  it("writes nothing when any row is invalid", () => {
    expect(() => importCsv(d, "company,role,stage\nA,B,applied\nC,D,hired\n")).toThrow(/Row 3/);
    expect(exportJson(d).applications).toEqual([]);
    expect(() => importJson(d, { app: "other" })).toThrow(/not an offerlog/);
    expect(() => importJson(d, { app: "offerlog", applications: [{ company: "A", role: "B" }, null, 42] })).toThrow(/list of objects/);
    expect(() => importJson(d, { app: "offerlog", applications: [{ company: "A", role: "B", notes: "oops" }] })).toThrow(/Application 1 notes/);
    expect(() => importCsv(d, "name,title\nx,y\n")).toThrow(/company and role/);
  });
});
