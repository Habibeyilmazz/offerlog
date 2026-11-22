import { isStage, WORK_MODES, type Stage, type WorkMode } from "./stages.ts";

export interface ApplicationInput {
  company: string;
  role: string;
  url: string;
  stage: Stage;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  location: string;
  workMode: WorkMode;
  source: string;
  description: string;
  nextStep: string;
  nextStepDue: string | null;
}

export type Result<T> = { ok: true; value: T } | { ok: false, error: string };

type Raw = Record<string, unknown>;

export class ValidationError extends Error {}

/** Trimmed string field; throws ValidationError rather than silently cutting text that is too long. */
export function str(raw: Raw, key: string, max = 200): string {
  const v = raw[key];
  if (v == null) return "";
  const s = String(v).trim();
  if (s.length > max) throw new ValidationError(`${key} is longer than ${max} characters.`);
  return s;
}

function money(raw: Raw, key: string): number | null | "bad" {
  const s = str(raw, key, 40).replace(/[\s,_]/g, "");
  if (s === "") return null;
  if (!/^\d{1,10}(k)?$/i.test(s)) return "bad";
  return Number(s.replace(/k$/i, "")) * (/k$/i.test(s) ? 1000 : 1);
}

export function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().startsWith(s);
}

export function safeUrl(s: string): boolean {
  if (s === "") return true;
  try {
    return ["http:", "https:"].includes(new URL(s).protocol);
  } catch {
    return false;
  }
}

export function parseApplication(raw: Raw): Result<ApplicationInput> {
  try {
    return parseApplicationFields(raw);
  } catch (e) {
    if (e instanceof ValidationError) return { ok: false, error: e.message };
    throw e;
  }
}

function parseApplicationFields(raw: Raw): Result<ApplicationInput> {
  const company = str(raw, "company");
  const role = str(raw, "role");
  if (!company) return { ok: false, error: "Company is required." };
  if (!role) return { ok: false, error: "Role is required." };

  const stage = str(raw, "stage") || "wishlist";
  if (!isStage(stage)) return { ok: false, error: `Unknown stage "${stage}".` };

  const url = str(raw, "url", 2000);
  if (!safeUrl(url)) return { ok: false, error: "Link must be an http(s) URL." };

  const salaryMin = money(raw, "salaryMin");
  const salaryMax = money(raw, "salaryMax");
  if (salaryMin === "bad" || salaryMax === "bad") return { ok: false, error: "Salary must be a whole number, like 85000 or 85k." };
  if (salaryMin != null && salaryMax != null && salaryMin > salaryMax)
    return { ok: false, error: "Minimum salary is above the maximum." };

  const currency = (str(raw, "currency", 10) || "USD").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: "Currency must be a 3-letter code like USD or EUR." };

  const workMode = str(raw, "workMode") || "onsite";
  if (!(WORK_MODES as readonly string[]).includes(workMode)) return { ok: false, error: "Work mode must be onsite, hybrid or remote." };

  const nextStepDue = str(raw, "nextStepDue", 40) || null;
  if (nextStepDue && !isIsoDate(nextStepDue)) return { ok: false, error: "Next step date must be YYYY-MM-DD." };

  return {
    ok: true,
    value: {
      company,
      role,
      url,
      stage,
      salaryMin,
      salaryMax,
      currency,
      location: str(raw, "location"),
      workMode: workMode as WorkMode,
      source: str(raw, "source", 80),
      description: str(raw, "description", 20000),
      nextStep: str(raw, "nextStep", 300),
      nextStepDue,
    },
  };
}
