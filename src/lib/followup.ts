import { today } from "./format.ts";

// shortcut: one fixed threshold for every stage; make it a setting if users ask for a different wait.
export const FOLLOW_UP_DAYS = 14;

/** Stages where the next move is the employer's. */
const WAITING = ["applied", "screening", "interview"];

interface AppLike {
  id: number;
  stage: string;
  nextStep: string;
  nextStepDue: string | null;
  createdAt: string;
}

/**
 * Applications waiting on the employer with no news for `after` days or more, longest silence first.
 * `lastActivity` maps an application id to its latest stage change or timeline note (ISO timestamp).
 * Applications with a dated next step are left out: they already show in Up next.
 */
export function waitingOnReply<A extends AppLike>(apps: A[], lastActivity: Map<number, string>, todayIso: string, after = FOLLOW_UP_DAYS) {
  return apps
    .filter((a) => WAITING.includes(a.stage) && !(a.nextStep && a.nextStepDue))
    .map((app) => {
      const since = today(new Date(lastActivity.get(app.id) ?? app.createdAt));
      return { app, days: Math.round((Date.parse(todayIso) - Date.parse(since)) / 86_400_000) };
    })
    .filter((w) => w.days >= after)
    .sort((a, b) => b.days - a.days);
}
