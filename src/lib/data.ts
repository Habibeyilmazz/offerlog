import { asc, desc, eq, sql } from "drizzle-orm";
import type { Db } from "../db/index.ts";
import { applications, contacts, events, notes, questions, settings } from "../db/schema.ts";
import { onDay, shortDate, today } from "./format.ts";
import { STAGE_LABELS, type Stage } from "./stages.ts";
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

/** Each application's latest stage change or timeline note (prep notes are not news), by id. */
export function lastActivity(d: Db): Map<number, string> {
  const rows = d.all<{ id: number; at: string }>(sql`
    SELECT application_id AS id, max(at) AS at FROM (
      SELECT application_id, at FROM events
      UNION ALL SELECT application_id, created_at FROM notes WHERE stage IS NULL
    ) GROUP BY application_id`);
  return new Map(rows.map((r) => [r.id, r.at]));
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

function eventsOf(d: Db, eventId: number) {
  const ev = d.select().from(events).where(eq(events.id, eventId)).get();
  if (!ev) return null;
  const list = d.select().from(events).where(eq(events.applicationId, ev.applicationId)).orderBy(asc(events.at), asc(events.id)).all();
  return { ev, list, i: list.findIndex((e) => e.id === eventId) };
}

/**
 * Moves a stage change to another calendar day (YYYY-MM-DD), keeping its time of day and its
 * place in the timeline. Redating the first entry also redates the application. Returns an error, or null.
 */
export function setEventDate(d: Db, eventId: number, day: string, now = new Date()): string | null {
  return d.transaction((tx) => {
    const found = eventsOf(tx as unknown as Db, eventId);
    if (!found) return "That timeline entry no longer exists.";
    const { ev, list, i } = found;
    const prev = list[i - 1];
    const next = list[i + 1];
    if (prev && day < today(new Date(prev.at)))
      return `This came after the move to ${STAGE_LABELS[prev.toStage as Stage]} on ${shortDate(prev.at)}. Pick that day or later, or change that entry first.`;
    if (next && day > today(new Date(next.at)))
      return `This came before the move to ${STAGE_LABELS[next.toStage as Stage]} on ${shortDate(next.at)}. Pick that day or earlier, or change that entry first.`;
    // On the same day as a neighbour, nudge the time so the order of the timeline stays the same.
    let t = Math.min(Date.parse(onDay(ev.at, day)), now.getTime());
    if (prev) t = Math.max(t, Date.parse(prev.at) + 1);
    if (next) t = Math.min(t, Date.parse(next.at) - 1);
    // The nudge must not cross midnight, pass now, or leave the order broken.
    if ((prev && t <= Date.parse(prev.at)) || (next && t >= Date.parse(next.at)) || t > now.getTime() || today(new Date(t)) !== day)
      return "There is no room on that day to keep this entry between the ones around it. Pick another day.";
    const at = new Date(t).toISOString();
    tx.update(events).set({ at }).where(eq(events.id, eventId)).run();
    if (i === 0) tx.update(applications).set({ createdAt: at }).where(eq(applications.id, ev.applicationId)).run();
    return null;
  });
}

/**
 * Removes a stage change logged by mistake. Later entries are re-linked (a move straight back
 * disappears with it) and the application's stage follows its last remaining entry.
 * The first entry cannot be removed. Returns an error, or null.
 */
export function removeEvent(d: Db, eventId: number, at = nowIso()): string | null {
  return d.transaction((tx) => {
    const found = eventsOf(tx as unknown as Db, eventId);
    if (!found) return "That timeline entry no longer exists.";
    const { ev, list, i } = found;
    if (i === 0) return "The first entry records when the application was added. Delete the application instead.";
    let prev = list[0];
    for (const e of list.slice(1)) {
      if (e.id === eventId || e.toStage === prev.toStage) {
        tx.delete(events).where(eq(events.id, e.id)).run();
        continue;
      }
      if (e.fromStage !== prev.toStage) tx.update(events).set({ fromStage: prev.toStage }).where(eq(events.id, e.id)).run();
      prev = e;
    }
    tx.update(applications).set({ stage: prev.toStage, updatedAt: at }).where(eq(applications.id, ev.applicationId)).run();
    return null;
  });
}

const exists = (d: Db, id: number) => d.select({ id: applications.id }).from(applications).where(eq(applications.id, id)).get() !== undefined;

/** False when the application no longer exists (deleted in another tab). */
export function addContact(d: Db, applicationId: number, c: { name: string; title: string; email: string; url: string }): boolean {
  if (!exists(d, applicationId)) return false;
  d.insert(contacts).values({ applicationId, ...c }).run();
  return true;
}

export function updateContact(d: Db, id: number, c: { name: string; title: string; email: string; url: string }) {
  d.update(contacts).set(c).where(eq(contacts.id, id)).run();
}

export function deleteContact(d: Db, id: number) {
  d.delete(contacts).where(eq(contacts.id, id)).run();
}

/** False when the application no longer exists (deleted in another tab). */
export function addNote(d: Db, applicationId: number, body: string, stage: Stage | null, at = nowIso()): boolean {
  if (!exists(d, applicationId)) return false;
  d.insert(notes).values({ applicationId, body, stage, createdAt: at }).run();
  return true;
}

/** Changes the text only; the note keeps its date and its place in the timeline. */
export function updateNote(d: Db, id: number, body: string) {
  d.update(notes).set({ body }).where(eq(notes.id, id)).run();
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
