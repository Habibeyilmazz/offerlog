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

/**
 * Position in the funnel: -1 for wishlist, 0 for applied, and so on. Being rejected or
 * ghosted implies the application was sent, so those count as at least "applied".
 */
function rank(stage: string): number {
  const i = FUNNEL.indexOf(stage as Stage);
  return i >= 0 ? i : stage === "rejected" || stage === "ghosted" ? 0 : -1;
}

/** The event where an application was first sent (its first move past wishlist), if any. */
function sentEvent(list: EventLite[]): EventLite | undefined {
  return list.find((e) => rank(e.toStage) >= 0);
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
    const furthest = Math.max(...list.map((e) => rank(e.toStage)));
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
  sentAt: string;
  replied: boolean;
  /** Days from applying to the first reply; null when there was no reply or the applied date is unknown. */
  days: number | null;
}

/**
 * For every sent application: whether and how fast the company replied. An application
 * logged straight into screening (or later) counts as replied, with an unknown reply time.
 */
export function replies(events: EventLite[]): Reply[] {
  const out: Reply[] = [];
  for (const [applicationId, list] of byApp(events)) {
    const sent = sentEvent(list);
    if (!sent) continue;
    const reply = list.find((e) => e.at >= sent.at && RESPONSE_STAGES.includes(e.toStage as Stage));
    out.push({
      applicationId,
      sentAt: sent.at,
      replied: Boolean(reply),
      days: reply && sent.toStage === "applied" ? (Date.parse(reply.at) - Date.parse(sent.at)) / DAY : null,
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
  // "LinkedIn", "linkedin " and "LINKEDIN" are one source, shown as the oldest application spells it.
  const label = new Map<string, string>();
  const sourceOf = new Map(
    [...apps].sort((a, b) => a.id - b.id).map((a) => {
      const name = a.source.trim().replace(/\s+/g, " ") || "Unknown";
      const key = name.toLowerCase();
      if (!label.has(key)) label.set(key, name);
      return [a.id, label.get(key)!];
    }),
  );
  const groups = new Map<string, Reply[]>();
  for (const r of replies(events)) {
    const source = sourceOf.get(r.applicationId);
    if (!source) continue;
    groups.set(source, [...(groups.get(source) ?? []), r]);
  }
  return [...groups]
    .map(([source, rs]) => {
      const replied = rs.filter((r) => r.replied).length;
      return {
        source,
        applied: rs.length,
        replied,
        rate: replied / rs.length,
        medianDays: median(rs.flatMap((r) => (r.days === null ? [] : [r.days]))),
      };
    })
    .sort((a, b) => b.applied - a.applied || a.source.localeCompare(b.source));
}

/** Monday of the week containing `d` in the server's time zone (TZ), as YYYY-MM-DD. */
export function weekStart(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).toLocaleDateString("sv-SE");
}

/** Applications sent per week for the last `weeks` weeks, oldest first. Each application counts once, in the week it was sent. */
export function weeklyApplied(events: EventLite[], now: Date, weeks = 8): { week: string; count: number }[] {
  const current = new Date(weekStart(now));
  const rows = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(current);
    d.setUTCDate(d.getUTCDate() - 7 * (weeks - 1 - i));
    return { week: d.toISOString().slice(0, 10), count: 0 };
  });
  const index = new Map(rows.map((r, i) => [r.week, i]));
  for (const list of byApp(events).values()) {
    const sent = sentEvent(list);
    const i = sent && index.get(weekStart(new Date(sent.at)));
    if (i !== undefined) rows[i].count++;
  }
  return rows;
}
