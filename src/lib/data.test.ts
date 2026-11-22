import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "../db/index.ts";
import { createApplication, deleteApplication, getApplication, getWeeklyGoal, listApplications, saveQuestion, listEvents, moveApplication, setWeeklyGoal, updateApplication, addNote, addContact, updateContact, updateNote, removeEvent, setEventDate } from "./data.ts";
import { funnel } from "./analytics.ts";
import { due, today } from "./format.ts";
import { isEmptyTracker, seedDemo } from "./seed.ts";
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
  it("returns false for a note or contact on an application deleted meanwhile (another tab)", () => {
    const id = createApplication(d, input({ company: "A", role: "B" }));
    expect(addNote(d, id, "hello", null)).toBe(true);
    expect(addContact(d, id, { name: "Sam", title: "", email: "", url: "" })).toBe(true);
    deleteApplication(d, id);
    expect(addNote(d, id, "hello", null)).toBe(false);
    expect(addContact(d, id, { name: "Sam", title: "", email: "", url: "" })).toBe(false);
  });
  it("returns false when an edited note, contact or question was deleted meanwhile, so the edit is not reported as saved", () => {
    const id = createApplication(d, input({ company: "A", role: "B" }));
    addNote(d, id, "hello", null);
    addContact(d, id, { name: "Sam", title: "", email: "", url: "" });
    saveQuestion(d, { question: "Why us?", category: "company", stage: "screening", answer: "" });
    const q = { question: "Why us?", category: "company", stage: "screening", answer: "a long answer" };
    expect(updateNote(d, 1, "edited")).toBe(true);
    expect(updateContact(d, 1, { name: "Sam O", title: "", email: "", url: "" })).toBe(true);
    expect(saveQuestion(d, { id: 1, ...q })).toBe(true);
    expect(updateNote(d, 99, "edited")).toBe(false);
    expect(updateContact(d, 99, { name: "Sam O", title: "", email: "", url: "" })).toBe(false);
    expect(saveQuestion(d, { id: 99, ...q })).toBe(false);
  });
  it("offers demo data only while there are no applications and no questions", () => {
    expect(isEmptyTracker(d)).toBe(true);
    saveQuestion(d, { question: "Why us?", category: "company", stage: "screening", answer: "my notes" });
    expect(isEmptyTracker(d)).toBe(false); // seeding now would delete this question bank
    const other = openDb(":memory:");
    createApplication(other, input({ company: "A", role: "B" }));
    expect(isEmptyTracker(other)).toBe(false);
  });
  it("seed script: refuses to replace a tracker that has data unless --force", () => {
    // `npm run db:seed` uses the same data/offerlog.db as `npm start`, and wiped a real search without asking.
    const dir = mkdtempSync(path.join(tmpdir(), "offerlog-seed-"));
    const file = path.join(dir, "t.db");
    const seed = (...args: string[]) => spawnSync(process.execPath, ["scripts/seed.ts", ...args], { env: { ...process.env, OFFERLOG_DB: file }, encoding: "utf8" });
    try {
      const mine = openDb(file);
      createApplication(mine, input({ company: "My Real Co", role: "Dev" }));
      const refused = seed();
      expect(refused.status).toBe(1);
      expect(refused.stderr).toContain("--force");
      expect(listApplications(mine).some((a) => a.company === "My Real Co")).toBe(true);
      expect(seed("--force").status).toBe(0);
      expect(listApplications(mine).some((a) => a.company === "My Real Co")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("dates demo next steps in local time", () => {
    const now = new Date(2026, 10, 22, 8); // 08:00 in Auckland is the previous day in UTC
    seedDemo(d, now);
    const app = listApplications(d).find((a) => a.company === "Fernhill Games")!;
    expect(due(app.nextStepDue!, today(now)).label).toBe("Due tomorrow");
  });
  it("edits a note and a contact in place", () => {
    const id = createApplication(d, input({ company: "A", role: "B" }));
    addNote(d, id, "first draft", "interview", "2026-11-01T00:00:00.000Z");
    addContact(d, id, { name: "Sam", title: "", email: "", url: "" });
    const before = getApplication(d, id)!;
    updateNote(d, before.notes[0].id, "final text");
    updateContact(d, before.contacts[0].id, { name: "Sam Ortiz", title: "Recruiter", email: "sam@example.com", url: "" });
    const after = getApplication(d, id)!;
    expect(after.notes[0]).toMatchObject({ body: "final text", stage: "interview", createdAt: "2026-11-01T00:00:00.000Z" });
    expect(after.contacts[0]).toMatchObject({ name: "Sam Ortiz", title: "Recruiter", email: "sam@example.com" });
  });
  it("stores the weekly goal", () => {
    expect(getWeeklyGoal(d)).toBe(5);
    setWeeklyGoal(d, 8);
    setWeeklyGoal(d, 9);
    expect(getWeeklyGoal(d)).toBe(9);
  });
});

describe("correcting the timeline", () => {
  const local = (day: number, hour: number) => new Date(2026, 10, day, hour).toISOString();
  const now = new Date(2026, 10, 22, 12);
  const chain = (id: number) => getApplication(d, id)!.events.map((e) => [e.fromStage, e.toStage, today(new Date(e.at))]);

  it("redates a stage change and keeps the timeline in order", () => {
    const id = createApplication(d, input({ company: "A", role: "B", stage: "applied" }), local(20, 9));
    moveApplication(d, id, "screening", local(22, 10));
    const [added, screening] = getApplication(d, id)!.events;
    expect(setEventDate(d, added.id, "2026-11-03", now)).toBeNull();
    expect(getApplication(d, id)!.app.createdAt).toBe(local(3, 9)); // the first entry carries the application's date
    expect(setEventDate(d, screening.id, "2026-11-10", now)).toBeNull();
    expect(chain(id)).toEqual([[null, "applied", "2026-11-03"], ["applied", "screening", "2026-11-10"]]);
    expect(new Date(getApplication(d, id)!.events[1].at).getHours()).toBe(10);
    // Cannot jump over a neighbour.
    expect(setEventDate(d, screening.id, "2026-11-02", now)).toMatch(/after the move to Applied on Nov 3, 2026/);
    expect(setEventDate(d, added.id, "2026-11-11", now)).toMatch(/before the move to Screening on Nov 10, 2026/);
    expect(setEventDate(d, 999, "2026-11-11", now)).toMatch(/no longer exists/);
  });
  it("nudges the time on a neighbour's day and never lands after now", () => {
    const id = createApplication(d, input({ company: "A", role: "B", stage: "applied" }), local(10, 15));
    moveApplication(d, id, "screening", local(12, 9));
    const [added, screening] = getApplication(d, id)!.events;
    expect(setEventDate(d, added.id, "2026-11-12", now)).toBeNull(); // 15:00 would land after the 09:00 move
    const evs = getApplication(d, id)!.events;
    expect(evs.map((e) => e.id)).toEqual([added.id, screening.id]);
    expect(Date.parse(evs[1].at) - Date.parse(evs[0].at)).toBe(1);
    const late = createApplication(d, input({ company: "C", role: "D" }), local(1, 18));
    expect(setEventDate(d, getApplication(d, late)!.events[0].id, "2026-11-22", now)).toBeNull();
    expect(getApplication(d, late)!.events[0].at).toBe(now.toISOString());
  });
  it("refuses a nudge that would cross midnight or pass now", () => {
    const id = createApplication(d, input({ company: "A", role: "B", stage: "applied" }), local(20, 9));
    moveApplication(d, id, "screening", new Date(2026, 10, 21, 0, 0, 0, 0).toISOString()); // exactly midnight
    const [added] = getApplication(d, id)!.events;
    expect(setEventDate(d, added.id, "2026-11-21", now)).toMatch(/no room/); // would land at 23:59:59.999 on the 20th
    expect(today(new Date(getApplication(d, id)!.events[0].at))).toBe("2026-11-20");
    // A neighbour a moment before now: the entry stays between it and now, never in the future.
    const recent = createApplication(d, input({ company: "C", role: "D", stage: "applied" }), new Date(now.getTime() - 100).toISOString());
    moveApplication(d, recent, "screening", now.toISOString());
    const moved = getApplication(d, recent)!.events[1];
    expect(setEventDate(d, moved.id, "2026-11-22", now)).toBeNull();
    expect(getApplication(d, recent)!.events[1].at).toBe(now.toISOString());
  });
  it("removes a mistaken move, so the funnel no longer counts it", () => {
    const id = createApplication(d, input({ company: "A", role: "B", stage: "applied" }), local(1, 9));
    moveApplication(d, id, "offer", local(2, 9)); // dropped in the wrong column
    moveApplication(d, id, "applied", local(2, 10)); // and dragged back
    expect(funnel(listEvents(d)).find((r) => r.stage === "offer")!.reached).toBe(1);
    const offer = getApplication(d, id)!.events[1];
    expect(removeEvent(d, offer.id)).toBeNull();
    expect(chain(id)).toEqual([[null, "applied", "2026-11-01"]]); // the move back is a no-op now and goes too
    expect(funnel(listEvents(d)).find((r) => r.stage === "offer")!.reached).toBe(0);
  });
  it("re-links later entries and moves the application back when the last change is removed", () => {
    const id = createApplication(d, input({ company: "A", role: "B", stage: "applied" }), local(1, 9));
    moveApplication(d, id, "screening", local(3, 9));
    moveApplication(d, id, "interview", local(5, 9));
    const [first, screening, interview] = getApplication(d, id)!.events;
    expect(removeEvent(d, first.id)).toMatch(/first entry/);
    expect(removeEvent(d, screening.id)).toBeNull();
    expect(chain(id)).toEqual([[null, "applied", "2026-11-01"], ["applied", "interview", "2026-11-05"]]);
    expect(removeEvent(d, interview.id)).toBeNull();
    expect(getApplication(d, id)!.app.stage).toBe("applied");
    expect(chain(id)).toEqual([[null, "applied", "2026-11-01"]]);
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
    expect(importCsv(other, exportCsv(d))).toEqual({ applications: 18, questions: 0, ignored: [] });
    expect(exportCsv(other)).toBe(exportCsv(d));
    expect(listEvents(other)).toHaveLength(18);
  });
  it("starts the CSV with a byte order mark, so Excel reads it as UTF-8", () => {
    // Without it Excel opens "Zürich" as "ZÃ¼rich".
    importCsv(d, "company,role,location\nA,B,Zürich\n");
    const csv = exportCsv(d);
    expect(csv.startsWith("\uFEFFcompany,")).toBe(true);
    const other = openDb(":memory:");
    importCsv(other, csv);
    expect(getApplication(other, 1)!.app.location).toBe("Zürich");
  });
  it("accepts camelCase headers and strips the formula guard", () => {
    importCsv(d, "Company,Role,Stage,nextStep\nAcme,Dev,applied,'=call\n");
    expect(getApplication(d, 1)!.app.nextStep).toBe("=call");
  });
  it("round-trips CSV text that starts with an apostrophe", () => {
    importCsv(d, "company,role,location\nAcme,'=SUM quoted,'s-Hertogenbosch\n");
    // A leading apostrophe before a formula character is the guard, so the first import strips it.
    expect(getApplication(d, 1)!.app).toMatchObject({ role: "=SUM quoted", location: "'s-Hertogenbosch" });
    updateApplication(d, 1, { role: "'=SUM quoted", nextStep: "'\t=call" });
    const csv = exportCsv(d);
    expect(csv).toContain(",'s-Hertogenbosch,"); // nothing added where no formula could start
    const other = openDb(":memory:");
    importCsv(other, csv);
    expect(getApplication(other, 1)!.app).toMatchObject({ role: "'=SUM quoted", location: "'s-Hertogenbosch", nextStep: "'\t=call" });
  });
  it("imports a tracking spreadsheet with its own column names and status words", () => {
    const sheet =
      "Company Name,Position,Status,Date Applied,Job Link,Work Type,Found Via,Salary,Notes\n" +
      "Fjordline,Junior Developer,Interviewing,10/14/2026,https://example.com/1,On-site,LinkedIn,40k-45k,Second round booked\n" +
      "Pebble,Data Intern,No response,2026-09-20,,Fully remote,Handshake,,\n" +
      "Saffron,Backend Dev,Online assessment,,,,,,\n";
    expect(importCsv(d, sheet, "2026-11-22T12:00:00.000Z")).toEqual({ applications: 3, questions: 0, ignored: ["Salary"] });
    const [a, b, c] = [1, 2, 3].map((id) => getApplication(d, id)!);
    expect(a.app).toMatchObject({ company: "Fjordline", role: "Junior Developer", stage: "interview", url: "https://example.com/1", workMode: "onsite", source: "LinkedIn" });
    expect(a.app.createdAt).toBe(new Date(2026, 9, 14).toISOString());
    // The note is dated with the row, so an old application still shows as waiting on a reply.
    expect(a.notes).toMatchObject([{ body: "Second round booked", stage: null, createdAt: new Date(2026, 9, 14).toISOString() }]);
    expect(b.app).toMatchObject({ stage: "ghosted", workMode: "remote" });
    expect(b.notes).toEqual([]);
    expect(c.app.stage).toBe("screening");
  });
  it("lets the first of two columns for the same field win and lists the other as ignored", () => {
    expect(importCsv(d, "Company,Employer,Role\nAcme,Other,Dev\n").ignored).toEqual(["Employer"]);
    expect(getApplication(d, 1)!.app.company).toBe("Acme");
  });
  it("names the accepted stages when a status word is unknown", () => {
    expect(() => importCsv(d, "company,role,status\nA,B,Withdrawn\n")).toThrow(/^Row 2: Unknown stage "Withdrawn"\. Use one of: wishlist, applied, .*ghosted\.$/);
    expect(() => importCsv(d, `company,role,notes\nA,B,${"x".repeat(20001)}\n`)).toThrow(/^Row 2: body is longer than 20000/);
  });
  it("reads semicolon-separated CSV from spreadsheets set to a European locale", () => {
    expect(importCsv(d, "company;role;salary_min\r\nAcme, Inc.;Dev;50000\r\n").applications).toBe(1);
    expect(getApplication(d, 1)!.app).toMatchObject({ company: "Acme, Inc.", role: "Dev", salaryMin: 50000 });
  });
  it("imports an application with thousands of stage changes", () => {
    const events = Array.from({ length: 9000 }, (_, i) => ({ toStage: i % 2 ? "offer" : "applied", at: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString() }));
    expect(importJson(d, { app: "offerlog", applications: [{ company: "A", role: "B", stage: "offer", events }] }).applications).toBe(1);
    expect(listEvents(d)).toHaveLength(9000);
  });
  it("names the record when a nested JSON field is invalid", () => {
    const long = "x".repeat(300);
    expect(() => importJson(d, { app: "offerlog", applications: [{ company: "A", role: "B", contacts: [{ name: long }] }] })).toThrow(
      /^Application 1: name is longer/,
    );
    expect(() => importJson(d, { app: "offerlog", questions: [{ question: "x".repeat(3000), category: "technical", stage: "interview" }] })).toThrow(
      /^Question 1: question is longer/,
    );
  });
  it("checks imported contacts like the contact form, and skips nameless ones", () => {
    const withContact = (c: object) => ({ app: "offerlog", applications: [{ company: "A", role: "B", contacts: [c] }] });
    expect(() => importJson(d, withContact({ name: "Sam", email: "sam@example.com?bcc=eve@example.net" }))).toThrow(/^Application 1 contact: Email/);
    expect(() => importJson(d, withContact({ name: "Sam", url: "javascript:alert(1)" }))).toThrow(/^Application 1 contact: Profile link/);
    expect(listApplications(d)).toHaveLength(0);
    importJson(d, { app: "offerlog", applications: [{ company: "A", role: "B", contacts: [{ name: "" }, { name: "Sam", email: "sam@example.com", url: "https://example.com/sam" }] }] });
    expect(getApplication(d, listApplications(d)[0].id)!.contacts).toMatchObject([{ name: "Sam", email: "sam@example.com", url: "https://example.com/sam" }]);
  });
  it("refuses an application whose stage disagrees with its last stage change", () => {
    const app = { company: "A", role: "B", stage: "offer", events: [{ toStage: "applied", at: "2026-01-01T09:00:00Z" }] };
    expect(() => importJson(d, { app: "offerlog", applications: [app] })).toThrow(/^Application 1: stage is offer, but its last stage change is to applied/);
    const reordered = { ...app, events: [{ fromStage: "applied", toStage: "offer", at: "2026-02-01T09:00:00Z" }, ...app.events] };
    expect(importJson(d, { app: "offerlog", applications: [reordered] }).applications).toBe(1);
  });
  it("refuses dates that are not real calendar times", () => {
    const now = "2026-11-22T00:00:00.000Z";
    const row = (createdAt: string) => `company,role,created_at\nA,B,${createdAt}\n`;
    expect(() => importCsv(d, row("5"), now)).toThrow(/Row 2 createdAt: "5" is not a valid date/); // Date.parse reads this as 2001
    expect(() => importCsv(d, row("45000"), now)).toThrow(/not a valid date/); // a spreadsheet serial number, read as year 45000
    expect(() => importCsv(d, row("2027-01-01"), now)).toThrow(/Row 2 createdAt: "2027-01-01" is in the future/);
    expect(() => importCsv(d, row("2026-02-30"), now)).toThrow(/not a valid date/); // Date.parse rolls this over to March 2
    expect(() => importCsv(d, row("02/30/2026"), now)).toThrow(/not a valid date/);
    expect(() => importCsv(d, row("2026/02/30"), now)).toThrow(/not a valid date/);
    expect(importCsv(d, row("11/20/2026 9:30"), now).applications).toBe(1); // what a spreadsheet writes back is still fine
    expect(importCsv(d, row("2026-11-22T20:00:00Z"), now).applications).toBe(1); // a clock a few hours ahead is tolerated
  });
  it("keeps a date-only value on that calendar day in the local time zone", () => {
    // Date.parse reads "2026-01-05" as UTC midnight, which is January 4 anywhere west of UTC.
    importCsv(d, "company,role,stage,created_at\nA,B,applied,2026-01-05\n");
    importJson(d, { app: "offerlog", applications: [{ company: "C", role: "D", stage: "applied", events: [{ toStage: "applied", at: "2026-01-06" }], notes: [{ body: "hi", createdAt: "2026-01-07" }] }] });
    const local = (day: number) => new Date(2026, 0, day).toISOString();
    expect(listApplications(d).map((a) => a.createdAt).sort()).toEqual([local(5), expect.any(String)]);
    expect(listEvents(d).map((e) => e.at).sort()).toEqual([local(5), local(6)]);
    expect(getApplication(d, 2)!.notes[0].createdAt).toBe(local(7));
  });
  it("refuses more than 2,000 applications in one file, which there is no bulk delete to undo", () => {
    // A wrong 5 MB CSV once added 160,000 applications and the board no longer loaded.
    const rows = (n: number) => "company,role\n" + "A,B\n".repeat(n);
    expect(importCsv(d, rows(2000)).applications).toBe(2000);
    expect(() => importCsv(d, rows(2001))).toThrow(/2,001 applications; one import takes at most 2,000/);
    const apps = Array.from({ length: 2001 }, () => ({ company: "A", role: "B" }));
    expect(() => importJson(d, { app: "offerlog", applications: apps })).toThrow(/at most 2,000/);
    expect(listApplications(d)).toHaveLength(2000);
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
