import type { Db } from "../db/index.ts";
import { applications, contacts, events, notes, questions } from "../db/schema.ts";
import { parseCsv, toCsv } from "./csv.ts";
import { getWeeklyGoal, setWeeklyGoal } from "./data.ts";
import { isStage, QUESTION_CATEGORIES } from "./stages.ts";
import { parseApplication, safeUrl, str } from "./validate.ts";

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

function timestamp(v: unknown, fallback: string, what: string): string {
  if (v == null || v === "") return fallback;
  const t = Date.parse(String(v));
  if (Number.isNaN(t)) throw new Error(`${what}: "${String(v)}" is not a valid date.`);
  return new Date(t).toISOString();
}

const asList = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null) : [];

function insertApplication(tx: Db, raw: Record<string, unknown>, label: string, now: string): void {
  const parsed = parseApplication(raw);
  if (!parsed.ok) throw new Error(`${label}: ${parsed.error}`);
  const createdAt = timestamp(raw.createdAt, now, `${label} createdAt`);
  const { id } = tx
    .insert(applications)
    .values({ ...parsed.value, createdAt, updatedAt: timestamp(raw.updatedAt, createdAt, `${label} updatedAt`) })
    .returning({ id: applications.id })
    .get();

  const evs = asList(raw.events);
  if (evs.length === 0) evs.push({ fromStage: null, toStage: parsed.value.stage, at: createdAt });
  for (const e of evs) {
    if (!isStage(e.toStage)) throw new Error(`${label}: event has unknown stage "${String(e.toStage)}".`);
    const fromStage = isStage(e.fromStage) ? e.fromStage : null;
    tx.insert(events).values({ applicationId: id, fromStage, toStage: e.toStage, at: timestamp(e.at, createdAt, `${label} event`) }).run();
  }
  for (const c of asList(raw.contacts)) {
    const name = str(c, "name");
    if (!name) continue;
    const url = str(c, "url", 2000);
    tx.insert(contacts).values({ applicationId: id, name, title: str(c, "title"), email: str(c, "email"), url: safeUrl(url) ? url : "" }).run();
  }
  for (const n of asList(raw.notes)) {
    const body = str(n, "body", 20000);
    if (!body) continue;
    tx.insert(notes).values({ applicationId: id, body, stage: isStage(n.stage) ? n.stage : null, createdAt: timestamp(n.createdAt, now, `${label} note`) }).run();
  }
}

/** Adds everything in an offerlog JSON export. Existing data is kept; nothing is written if any record is invalid. */
export function importJson(d: Db, data: unknown, now = new Date().toISOString()): ImportResult {
  if (typeof data !== "object" || data === null || (data as { app?: unknown }).app !== "offerlog")
    throw new Error("This is not an offerlog JSON export.");
  const doc = data as Record<string, unknown>;
  const apps = asList(doc.applications);
  const qs = asList(doc.questions);
  d.transaction((tx) => {
    apps.forEach((raw, i) => insertApplication(tx as unknown as Db, raw, `Application ${i + 1}`, now));
    qs.forEach((q, i) => {
      const question = str(q, "question", 2000);
      const category = str(q, "category");
      const stage = str(q, "stage");
      if (!question || !(QUESTION_CATEGORIES as readonly string[]).includes(category) || !isStage(stage))
        throw new Error(`Question ${i + 1}: needs text, a known category and stage.`);
      tx.insert(questions).values({ question, category, stage, answer: str(q, "answer", 20000), createdAt: timestamp(q.createdAt, now, `Question ${i + 1}`) }).run();
    });
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
        if (k) raw[k] = (cells[j] ?? "").replace(/^'(?=[=+\-@])/, "");
      });
      insertApplication(tx as unknown as Db, raw, `Row ${i + 2}`, now);
    });
  });
  return { applications: rows.length, questions: 0 };
}
