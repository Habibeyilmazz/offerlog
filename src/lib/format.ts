export function money(min: number | null, max: number | null, currency: string): string {
  if (min == null && max == null) return "";
  const f = new Intl.NumberFormat("en", { style: "currency", currency, notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: 1 });
  if (min != null && max != null && min !== max) return `${f.format(min)}–${f.format(max)}`;
  return f.format((min ?? max) as number);
}

/** Today's date (YYYY-MM-DD) in the server's local time zone. */
export function today(now = new Date()): string {
  return now.toLocaleDateString("sv-SE");
}

export type DueState = "overdue" | "today" | "soon";

/** Human label for a YYYY-MM-DD due date relative to `todayIso`. */
export function due(date: string, todayIso: string): { label: string; state: DueState } {
  const days = Math.round((Date.parse(date) - Date.parse(todayIso)) / 86_400_000);
  if (days < 0) return { label: days === -1 ? "1 day overdue" : `${-days} days overdue`, state: "overdue" };
  if (days === 0) return { label: "Due today", state: "today" };
  return { label: days === 1 ? "Due tomorrow" : `Due in ${days} days`, state: "soon" };
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

export const pct = (x: number | null) => (x == null ? "–" : `${Math.round(x * 100)}%`);

/** "Lisbon, hybrid"; drops the work mode when it is onsite or the location already says remote. */
export function place(location: string, workMode: string): string {
  const mode = workMode === "onsite" || (workMode === "remote" && /remote/i.test(location)) ? "" : workMode;
  return [location, mode].filter(Boolean).join(", ");
}

/** plural(1, "offer") is "1 offer", plural(3, "offer") is "3 offers"; withCount false drops the number. */
export function plural(n: number, word: string, withCount = true): string {
  const w = n === 1 ? word : `${word}s`;
  return withCount ? `${n} ${w}` : w;
}
