"use server";

// Every export here is a public POST endpoint: each one checks the session and validates its input.
// Next.js rejects server action calls whose Origin does not match the Host, which covers CSRF.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/index.ts";
import { aiEnabled, rewriteBullets } from "@/lib/ai.ts";
import * as data from "@/lib/data.ts";
import { onDay, plural, today } from "@/lib/format.ts";
import { gapReport } from "@/lib/keywords.ts";
import { seedDemo } from "@/lib/seed.ts";
import { endSession, requireUser } from "@/lib/session.ts";
import { isStage, QUESTION_CATEGORIES } from "@/lib/stages.ts";
import { importCsv, importJson } from "@/lib/transfer.ts";
import { parseApplication, parseContact, pastDay, str, ValidationError } from "@/lib/validate.ts";

export type FormState = { error?: string; message?: string };

const fields = (form: FormData) => Object.fromEntries(form.entries());

function id(v: unknown): number {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error("Invalid id");
  return n;
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function saveApplication(_prev: FormState, form: FormData): Promise<FormState> {
  await requireUser();
  const parsed = parseApplication(fields(form));
  if (!parsed.ok) return { error: parsed.error };
  let appId: number;
  if (form.get("id")) {
    appId = id(form.get("id"));
    if (!data.updateApplication(db(), appId, parsed.value)) return { error: "That application no longer exists." };
  } else {
    // Backfilling: the day the application reached its starting stage, if not today.
    const day = pastDay(fields(form), "stageDate", today());
    if (!day.ok) return { error: day.error };
    appId = data.createApplication(db(), parsed.value, day.value ? onDay(new Date().toISOString(), day.value) : undefined);
  }
  revalidatePath("/", "layout");
  redirect(`/applications/${appId}`);
}

export async function moveApplication(appId: number, stage: string) {
  await requireUser();
  if (!isStage(stage)) throw new Error("Unknown stage");
  data.moveApplication(db(), id(appId), stage);
  revalidatePath("/", "layout");
}

export async function deleteApplication(form: FormData) {
  await requireUser();
  data.deleteApplication(db(), id(form.get("id")));
  revalidatePath("/", "layout");
  redirect("/");
}

export async function completeNextStep(form: FormData) {
  await requireUser();
  const appId = id(form.get("id"));
  const detail = data.getApplication(db(), appId);
  if (!detail) return;
  if (detail.app.nextStep) data.addNote(db(), appId, `Done: ${detail.app.nextStep}`, null);
  data.updateApplication(db(), appId, { nextStep: "", nextStepDue: null });
  revalidatePath("/", "layout");
}

export async function updateEventDate(_prev: FormState, form: FormData): Promise<FormState> {
  await requireUser();
  const raw = fields(form);
  const day = pastDay(raw, "date", today());
  if (!day.ok) return { error: day.error };
  if (!day.value) return { error: "Pick a date." };
  const error = data.setEventDate(db(), id(raw.id), day.value);
  if (error) return { error };
  revalidatePath("/", "layout");
  return {};
}

export async function removeEvent(form: FormData) {
  await requireUser();
  data.removeEvent(db(), id(form.get("id")));
  revalidatePath("/", "layout");
}

export async function addContact(_prev: FormState, form: FormData): Promise<FormState> {
  await requireUser();
  const raw = fields(form);
  const contact = parseContact(raw);
  if (!contact.ok) return { error: contact.error };
  data.addContact(db(), id(raw.applicationId), contact.value);
  revalidatePath(`/applications/${id(raw.applicationId)}`);
  return {};
}

export async function updateContact(_prev: FormState, form: FormData): Promise<FormState> {
  await requireUser();
  const raw = fields(form);
  const contact = parseContact(raw);
  if (!contact.ok) return { error: contact.error };
  data.updateContact(db(), id(raw.id), contact.value);
  revalidatePath(`/applications/${id(raw.applicationId)}`);
  return {};
}

export async function deleteContact(form: FormData) {
  await requireUser();
  data.deleteContact(db(), id(form.get("id")));
  revalidatePath(`/applications/${id(form.get("applicationId"))}`);
}

export async function addNote(form: FormData) {
  await requireUser();
  const raw = fields(form);
  const body = str(raw, "body", 20000);
  const stage = str(raw, "stage");
  if (!body) return;
  data.addNote(db(), id(raw.applicationId), body, isStage(stage) ? stage : null);
  revalidatePath(`/applications/${raw.applicationId}`);
}

export async function updateNote(form: FormData) {
  await requireUser();
  const raw = fields(form);
  const body = str(raw, "body", 20000);
  if (!body) return;
  data.updateNote(db(), id(raw.id), body);
  revalidatePath(`/applications/${id(raw.applicationId)}`);
}

export async function deleteNote(form: FormData) {
  await requireUser();
  data.deleteNote(db(), id(form.get("id")));
  revalidatePath(`/applications/${id(form.get("applicationId"))}`);
}

export async function saveQuestion(_prev: FormState, form: FormData): Promise<FormState> {
  await requireUser();
  const raw = fields(form);
  let question: string, answer: string;
  try {
    question = str(raw, "question", 2000);
    answer = str(raw, "answer", 20000);
  } catch (e) {
    if (e instanceof ValidationError) return { error: e.message };
    throw e;
  }
  const category = str(raw, "category");
  const stage = str(raw, "stage");
  if (!question) return { error: "Write the question first." };
  if (!(QUESTION_CATEGORIES as readonly string[]).includes(category)) return { error: "Pick a category." };
  if (!isStage(stage)) return { error: "Pick a stage." };
  data.saveQuestion(db(), { id: raw.id ? id(raw.id) : undefined, question, category, stage, answer });
  revalidatePath("/", "layout");
  return { message: raw.id ? "Saved." : "Added to the bank." };
}

export async function deleteQuestion(form: FormData) {
  await requireUser();
  data.deleteQuestion(db(), id(form.get("id")));
  revalidatePath("/", "layout");
}

export async function setWeeklyGoal(form: FormData) {
  await requireUser();
  const goal = Number(form.get("goal"));
  if (!Number.isInteger(goal) || goal < 1 || goal > 100) return;
  data.setWeeklyGoal(db(), goal);
  revalidatePath("/analytics");
}

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export async function importFile(_prev: FormState, form: FormData): Promise<FormState> {
  await requireUser();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a .csv or .json file." };
  if (file.size > MAX_IMPORT_BYTES) return { error: "That file is over 5 MB." };
  const text = await file.text();
  try {
    const isJson = file.name.toLowerCase().endsWith(".json") || text.trimStart().startsWith("{");
    const res = isJson ? importJson(db(), JSON.parse(text)) : importCsv(db(), text);
    revalidatePath("/", "layout");
    return { message: `Imported ${plural(res.applications, "application")}${res.questions ? ` and ${plural(res.questions, "question")}` : ""}.` };
  } catch (e) {
    return { error: e instanceof SyntaxError ? "That JSON file could not be parsed." : (e as Error).message };
  }
}

/** Only fills an empty tracker, so it can never overwrite real data. */
export async function loadDemoData() {
  await requireUser();
  if (data.listApplications(db()).length === 0) seedDemo(db());
  revalidatePath("/", "layout");
  redirect("/");
}

export async function aiRewrite(_prev: FormState & { text?: string }, form: FormData): Promise<FormState & { text?: string }> {
  await requireUser();
  if (!aiEnabled()) return { error: "AI rewrite needs ANTHROPIC_API_KEY on the server." };
  const raw = fields(form);
  let jd: string, resume: string, bullets: string;
  try {
    jd = str(raw, "jobDescription", 30000);
    resume = str(raw, "resume", 30000);
    bullets = str(raw, "bullets", 8000);
  } catch (e) {
    if (e instanceof ValidationError) return { error: e.message };
    throw e;
  }
  if (!jd || !bullets) return { error: "Paste a job description and the bullets you want rewritten." };
  const report = gapReport(jd, resume || bullets);
  const missing = [...report.skills.missing, ...report.tools.missing].map((t) => t.name);
  try {
    return { text: await rewriteBullets(jd, bullets, missing) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
