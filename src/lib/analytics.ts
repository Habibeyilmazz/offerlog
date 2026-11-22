import { FUNNEL, RESPONSE_STAGES, type Stage } from "./stages.ts";

export interface AppLite {
  id: number;
  source: string;
}
export interface EventLite {
  applicationId: number;
  toStage: string;
  at: string;
}

const DAY = 86_400_000;

function byApp(events: EventLite[]): Map<number, EventLite[]> {
  const map = new Map<number, EventLite[]>();
  for (const e of [...events].sort((a, b) => a.at.localeCompare(b.at))) {
    const list = map.get(e.applicationId) ?? [];
    list.push(e);
    map.set(e.applicationId, list);
  }
  return map;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export interface FunnelRow {
  stage: Stage;
  reached: number;
  /** Share of the previous funnel stage that made it here; null for the first stage or an empty previous stage. */
  conversion: number | null;
}

/** How many applications ever reached each funnel stage (a jump from applied to interview counts as passing screening). */
export function funnel(events: EventLite[]): FunnelRow[] {
  const reached = FUNNEL.map(() => 0);
  for (const list of byApp(events).values()) {
    const furthest = Math.max(...list.map((e) => FUNNEL.indexOf(e.toStage as Stage)));
    for (let i = 0; i <= furthest; i++) reached[i]++;
  }
  return FUNNEL.map((stage, i) => ({
    stage,
    reached: reached[i],
    conversion: i === 0 || reached[i - 1] === 0 ? null : reached[i] / reached[i - 1],
  }));
}

export interface Reply {
  applicationId: number;
  appliedAt: string;
  repliedAt: string | null;
  days: number | null;
}

/** For every application that was applied to: when (if ever) the company first replied. */
export function replies(events: EventLite[]): Reply[] {
  const out: Reply[] = [];
  for (const [applicationId, list] of byApp(events)) {
    const applied = list.find((e) => e.toStage === "applied");
    if (!applied) continue;
    const reply = list.find((e) => e.at >= applied.at && RESPONSE_STAGES.includes(e.toStage as Stage));
    out.push({
      applicationId,
      appliedAt: applied.at,
      repliedAt: reply?.at ?? null,
      days: reply ? (Date.parse(reply.at) - Date.parse(applied.at)) / DAY : null,
    });
  }
  return out;
}

export interface SourceRow {
  source: string;
  applied: number;
  replied: number;
  rate: number;
  medianDays: number | null;
}

export function responseBySource(apps: AppLite[], events: EventLite[]): SourceRow[] {
  const sourceOf = new Map(apps.map((a) => [a.id, a.source.trim() || "Unknown"]));
  const groups = new Map<string, Reply[]>();
  for (const r of replies(events)) {
    const source = sourceOf.get(r.applicationId);
    if (!source) continue;
    groups.set(source, [...(groups.get(source) ?? []), r]);
  }
  return [...groups]
    .map(([source, rs]) => {
      const answered = rs.filter((r) => r.days !== null);
      return {
        source,
        applied: rs.length,
        replied: answered.length,
        rate: answered.length / rs.length,
        medianDays: median(answered.map((r) => r.days as number)),
      };
    })
    .sort((a, b) => b.applied - a.applied || a.source.localeCompare(b.source));
}

/** Monday (UTC) of the week containing `d`, as YYYY-MM-DD. */
export function weekStart(d: Date): string {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

/** Applications sent per week for the last `weeks` weeks, oldest first. */
export function weeklyApplied(events: EventLite[], now: Date, weeks = 8): { week: string; count: number }[] {
  const current = new Date(weekStart(now));
  const rows = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(current);
    d.setUTCDate(d.getUTCDate() - 7 * (weeks - 1 - i));
    return { week: d.toISOString().slice(0, 10), count: 0 };
  });
  const index = new Map(rows.map((r, i) => [r.week, i]));
  for (const e of events) {
    if (e.toStage !== "applied") continue;
    const i = index.get(weekStart(new Date(e.at)));
    if (i !== undefined) rows[i].count++;
  }
  return rows;
}
