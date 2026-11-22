import { asc, desc, eq } from "drizzle-orm";
import type { Db } from "../db/index.ts";
import { applications, contacts, events, notes, questions, settings } from "../db/schema.ts";
import type { Stage } from "./stages.ts";
import type { ApplicationInput } from "./validate.ts";

const nowIso = () => new Date().toISOString();

export function createApplication(d: Db, input: ApplicationInput, at = nowIso()): number {
  return d.transaction((tx) => {
    const row = tx
      .insert(applications)
      .values({ ...input, createdAt: at, updatedAt: at })
      .returning({ id: applications.id })
      .get();
    tx.insert(events).values({ applicationId: row.id, fromStage: null, toStage: input.stage, at }).run();
    return row.id;
  });
}

/** Updates fields (any subset) and records a stage transition if the stage changed. Returns false if the application does not exist. */
export function updateApplication(d: Db, id: number, input: Partial<ApplicationInput>, at = nowIso()): boolean {
  return d.transaction((tx) => {
    const app = tx.select({ stage: applications.stage }).from(applications).where(eq(applications.id, id)).get();
    if (!app) return false;
    tx.update(applications).set({ ...input, updatedAt: at }).where(eq(applications.id, id)).run();
    if (input.stage && input.stage !== app.stage)
      tx.insert(events).values({ applicationId: id, fromStage: app.stage, toStage: input.stage, at }).run();
    return true;
  });
}

export const moveApplication = (d: Db, id: number, stage: Stage, at = nowIso()) => updateApplication(d, id, { stage }, at);

export function deleteApplication(d: Db, id: number): void {
  d.delete(applications).where(eq(applications.id, id)).run();
}

export function listApplications(d: Db) {
  return d.select().from(applications).orderBy(desc(applications.updatedAt)).all();
}

export function listEvents(d: Db) {
  return d.select().from(events).orderBy(asc(events.at)).all();
}

export function getApplication(d: Db, id: number) {
  const app = d.select().from(applications).where(eq(applications.id, id)).get();
  if (!app) return null;
  return {
    app,
    contacts: d.select().from(contacts).where(eq(contacts.applicationId, id)).orderBy(asc(contacts.id)).all(),
    notes: d.select().from(notes).where(eq(notes.applicationId, id)).orderBy(desc(notes.createdAt)).all(),
    events: d.select().from(events).where(eq(events.applicationId, id)).orderBy(asc(events.at)).all(),
  };
}

export function addContact(d: Db, applicationId: number, c: { name: string; title: string; email: string; url: string }) {
  d.insert(contacts).values({ applicationId, ...c }).run();
}

export function deleteContact(d: Db, id: number) {
  d.delete(contacts).where(eq(contacts.id, id)).run();
}

export function addNote(d: Db, applicationId: number, body: string, stage: Stage | null, at = nowIso()) {
  d.insert(notes).values({ applicationId, body, stage, createdAt: at }).run();
}

export function deleteNote(d: Db, id: number) {
  d.delete(notes).where(eq(notes.id, id)).run();
}

export function listQuestions(d: Db) {
  return d.select().from(questions).orderBy(asc(questions.category), asc(questions.id)).all();
}

export function saveQuestion(
  d: Db,
  q: { id?: number; question: string; category: string; stage: string; answer: string },
  at = nowIso(),
) {
  const { id, ...values } = q;
  if (id) d.update(questions).set(values).where(eq(questions.id, id)).run();
  else d.insert(questions).values({ ...values, createdAt: at }).run();
}

export function deleteQuestion(d: Db, id: number) {
  d.delete(questions).where(eq(questions.id, id)).run();
}

export const DEFAULT_WEEKLY_GOAL = 5;

export function getWeeklyGoal(d: Db): number {
  const row = d.select().from(settings).where(eq(settings.key, "weeklyGoal")).get();
  const n = Number(row?.value);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_WEEKLY_GOAL;
}

export function setWeeklyGoal(d: Db, goal: number) {
  d.insert(settings)
    .values({ key: "weeklyGoal", value: String(goal) })
    .onConflictDoUpdate({ target: settings.key, set: { value: String(goal) } })
    .run();
}
