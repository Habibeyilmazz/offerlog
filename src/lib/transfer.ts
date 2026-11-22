import type { Db } from "../db/index.ts";
import { applications, contacts, events, notes, questions } from "../db/schema.ts";
import { parseCsv, toCsv } from "./csv.ts";
import { getWeeklyGoal, setWeeklyGoal } from "./data.ts";
import { isStage, QUESTION_CATEGORIES } from "./stages.ts";
import { isIsoDate, parseApplication, safeUrl, str, ValidationError } from "./validate.ts";

const CSV_COLUMNS = [
  ["company", "company"],
  ["role", "role"],
  ["stage", "stage"],
  ["url", "url"],
  ["salary_min", "salaryMin"],
  ["salary_max", "salaryMax"],
  ["currency", "currency"],
  ["location", "location"],
  ["work_mode", "workMode"],
  ["source", "source"],
  ["next_step", "nextStep"],
  ["next_step_due", "nextStepDue"],
  ["created_at", "createdAt"],
] as const;

export function exportCsv(d: Db): string {
  const rows = d.select().from(applications).all();
  return toCsv(
    CSV_COLUMNS.map(([col]) => col),
    rows.map((r) => CSV_COLUMNS.map(([, key]) => r[key])),
  );
}

export function exportJson(d: Db) {
  const byApp = <T extends { applicationId: number }>(rows: T[]) => {
    const m = new Map<number, Omit<T, "applicationId" | "id">[]>();
    for (const { applicationId, id: _id, ...rest } of rows as (T & { id: number })[]) {
      m.set(applicationId, [...(m.get(applicationId) ?? []), rest]);
    }
    return m;
  };
  const c = byApp(d.select().from(contacts).all());
  const n = byApp(d.select().from(notes).all());
  const e = byApp(d.select().from(events).all());
  return {
    app: "offerlog",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: { weeklyGoal: getWeeklyGoal(d) },
    applications: d
      .select()
      .from(applications)
      .all()
      .map(({ id, ...app }) => ({ ...app, contacts: c.get(id) ?? [], notes: n.get(id) ?? [], events: e.get(id) ?? [] })),
    questions: d
      .select()
      .from(questions)
      .all()
      .map(({ id: _id, ...q }) => q),
  };
}

export interface ImportResult {
  applications: number;
  questions: number;
}

/** An ISO timestamp from any date Date.parse reads, if it names a four-digit year and is not later than a day after `now`. */
function timestamp(v: unknown, fallback: string, what: string, now: string): string {
  if (v == null || v === "") return fallback;
  const s = String(v);
  const t = Date.parse(s);
  const ymd = /^\d{4}-\d{2}-\d{2}/.exec(s)?.[0];
  // Date.parse turns "5" into 2001, a spreadsheet serial like "45000" into the year 45000, and Feb 30 into March 2.
  // An all-numeric date like 02/30/2026 is local time; a rolled-over one reads a month and day that are not in the text.
  const nums = s.match(/\d+/g)?.map(Number) ?? [];
  const local = new Date(t);
  const rolled = ymd ? !isIsoDate(ymd) : !/[a-z]/i.test(s) && !(nums.includes(local.getMonth() + 1) && nums.includes(local.getDate()));
  if (Number.isNaN(t) || !/\d{4}/.test(s) || !/^\d{4}-/.test(new Date(t).toISOString()) || rolled)
    throw new Error(`${what}: "${s}" is not a valid date.`);
  // A day of slack for a backup made on a machine whose clock runs ahead.
  if (t > Date.parse(now) + 86_400_000) throw new Error(`${what}: "${s}" is in the future.`);
  return new Date(t).toISOString();
}

function asList(v: unknown, what: string): Record<string, unknown>[] {
  if (v == null) return [];
  if (!Array.isArray(v) || v.some((x) => typeof x !== "object" || x === null || Array.isArray(x)))
    throw new Error(`${what} must be a list of objects.`);
  return v;
}

/** Prefixes a field error from `str` with the record it came from. */
function labelled(label: string, f: () => void): void {
  try {
    f();
  } catch (e) {
    if (e instanceof ValidationError) throw new Error(`${label}: ${e.message}`);
    throw e;
  }
}

function insertApplication(tx: Db, raw: Record<string, unknown>, label: string, now: string): void {
  const parsed = parseApplication(raw);
  if (!parsed.ok) throw new Error(`${label}: ${parsed.error}`);
  const createdAt = timestamp(raw.createdAt, now, `${label} createdAt`, now);
  const { id } = tx
    .insert(applications)
    .values({ ...parsed.value, createdAt, updatedAt: timestamp(raw.updatedAt, createdAt, `${label} updatedAt`, now) })
    .returning({ id: applications.id })
    .get();

  const evs = asList(raw.events, `${label} events`).map((e) => {
    if (!isStage(e.toStage)) throw new Error(`${label}: event has unknown stage "${String(e.toStage)}".`);
    return { applicationId: id, fromStage: isStage(e.fromStage) ? e.fromStage : null, toStage: e.toStage, at: timestamp(e.at, createdAt, `${label} event`, now) };
  });
  if (evs.length === 0) evs.push({ applicationId: id, fromStage: null, toStage: parsed.value.stage, at: createdAt });
  // The board shows the stage, the timeline and analytics the events; they must agree. Ties go to the later entry, like (at, id).
  const last = evs.reduce((a, b) => (b.at >= a.at ? b : a));
  if (last.toStage !== parsed.value.stage)
    throw new Error(`${label}: stage is ${parsed.value.stage}, but its last stage change is to ${last.toStage}.`);
  for (const e of evs) tx.insert(events).values(e).run(); // one row per statement: SQLite caps variables per statement
  for (const c of asList(raw.contacts, `${label} contacts`)) {
    const name = str(c, "name");
    if (!name) continue;
    const url = str(c, "url", 2000);
    tx.insert(contacts).values({ applicationId: id, name, title: str(c, "title"), email: str(c, "email"), url: safeUrl(url) ? url : "" }).run();
  }
  for (const n of asList(raw.notes, `${label} notes`)) {
    const body = str(n, "body", 20000);
    if (!body) continue;
    tx.insert(notes).values({ applicationId: id, body, stage: isStage(n.stage) ? n.stage : null, createdAt: timestamp(n.createdAt, now, `${label} note`, now) }).run();
  }
}

/** Adds everything in an offerlog JSON export. Existing data is kept; nothing is written if any record is invalid. */
export function importJson(d: Db, data: unknown, now = new Date().toISOString()): ImportResult {
  if (typeof data !== "object" || data === null || (data as { app?: unknown }).app !== "offerlog")
    throw new Error("This is not an offerlog JSON export.");
  const doc = data as Record<string, unknown>;
  const apps = asList(doc.applications, "applications");
  const qs = asList(doc.questions, "questions");
  d.transaction((tx) => {
    apps.forEach((raw, i) => labelled(`Application ${i + 1}`, () => insertApplication(tx as unknown as Db, raw, `Application ${i + 1}`, now)));
    qs.forEach((q, i) => labelled(`Question ${i + 1}`, () => {
      const question = str(q, "question", 2000);
      const category = str(q, "category");
      const stage = str(q, "stage");
      if (!question || !(QUESTION_CATEGORIES as readonly string[]).includes(category) || !isStage(stage))
        throw new Error(`Question ${i + 1}: needs text, a known category and stage.`);
      tx.insert(questions).values({ question, category, stage, answer: str(q, "answer", 20000), createdAt: timestamp(q.createdAt, now, `Question ${i + 1}`, now) }).run();
    }));
    const goal = Number((doc.settings as { weeklyGoal?: unknown } | undefined)?.weeklyGoal);
    if (Number.isInteger(goal) && goal > 0 && goal <= 100) setWeeklyGoal(tx as unknown as Db, goal);
  });
  return { applications: apps.length, questions: qs.length };
}

/** Adds one application per CSV row. Columns are matched by header name (snake_case or camelCase). */
export function importCsv(d: Db, text: string, now = new Date().toISOString()): ImportResult {
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new Error("The CSV file is empty.");
  const keys = header.map((h) => {
    const norm = h.trim().toLowerCase().replace(/[\s-]/g, "_");
    return CSV_COLUMNS.find(([col, key]) => col === norm || key.toLowerCase() === norm)?.[1];
  });
  if (!keys.includes("company") || !keys.includes("role")) throw new Error("The CSV needs at least company and role columns.");
  d.transaction((tx) => {
    rows.forEach((cells, i) => {
      const raw: Record<string, unknown> = {};
      keys.forEach((k, j) => {
        // Undo the spreadsheet formula guard added by exportCsv.
        if (k) raw[k] = (cells[j] ?? "").replace(/^'(?='*[=+\-@\t\r])/, "");
      });
      insertApplication(tx as unknown as Db, raw, `Row ${i + 2}`, now);
    });
  });
  return { applications: rows.length, questions: 0 };
}
