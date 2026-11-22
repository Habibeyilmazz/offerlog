import { setWeeklyGoal } from "@/app/actions.ts";
import { db } from "@/db/index.ts";
import { funnel, median, replies, responseBySource, weeklyApplied } from "@/lib/analytics.ts";
import { getWeeklyGoal, listApplications, listEvents } from "@/lib/data.ts";
import { pct } from "@/lib/format.ts";
import { requireUser } from "@/lib/session.ts";
import { STAGE_LABELS } from "@/lib/stages.ts";

const days = (d: number | null) => (d == null ? "–" : `${Math.round(d * 10) / 10} d`);

export default async function AnalyticsPage() {
  await requireUser();
  const apps = listApplications(db());
  const events = listEvents(db());
  const goal = getWeeklyGoal(db());
  const rows = funnel(events);
  const reps = replies(events);
  const answered = reps.filter((r) => r.days !== null);
  const sources = responseBySource(apps, events);
  const weeks = weeklyApplied(events, new Date());
  const top = Math.max(goal, ...weeks.map((w) => w.count), 1);
  const thisWeek = weeks[weeks.length - 1].count;
  const applied = rows[0].reached;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <p className="muted">Computed from every stage change you have logged. Rejections count as replies; ghosted applications do not.</p>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat">
          <strong>{applied}</strong>
          <span>applications sent</span>
        </div>
        <div className="stat">
          <strong>{pct(reps.length ? answered.length / reps.length : null)}</strong>
          <span>got a reply</span>
        </div>
        <div className="stat">
          <strong>{days(median(answered.map((r) => r.days as number)))}</strong>
          <span>median time to reply</span>
        </div>
        <div className="stat">
          <strong>{rows[3].reached}</strong>
          <span>offers</span>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel" aria-labelledby="funnel-h">
          <h2 id="funnel-h">Funnel</h2>
          <div className="funnel">
            {rows.map((r) => (
              <div key={r.stage} className="funnel-row" style={{ "--stage": `var(--st-${r.stage})` } as React.CSSProperties}>
                <span>{STAGE_LABELS[r.stage]}</span>
                <div className="bar-track">
                  <div className="bar" style={{ width: `${applied ? (r.reached / applied) * 100 : 0}%` }}>
                    {r.reached}
                  </div>
                </div>
                <span className="small muted" title="Conversion from the previous stage">
                  {r.conversion == null ? "" : pct(r.conversion)}
                </span>
              </div>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>
            Percentages are conversion from the stage above. Skipping a stage counts as passing it.
          </p>
        </section>

        <section className="panel" aria-labelledby="weekly-h">
          <h2 id="weekly-h">Applications per week</h2>
          <p className="small muted" style={{ marginTop: -6, marginBottom: 12 }}>
            {thisWeek >= goal ? `Goal met this week: ${thisWeek} of ${goal}.` : `${thisWeek} of ${goal} this week.`}
          </p>
          <div className="weeks" role="img" aria-label={`Applications per week for the last 8 weeks: ${weeks.map((w) => w.count).join(", ")}. Goal ${goal}.`}>
            <div className="goal-line" style={{ bottom: `calc(22px + (100% - 30px) * ${goal / top})` }}>
              <span>Goal {goal}</span>
            </div>
            {weeks.map((w) => (
              <div key={w.week} className="week">
                <div className={`col${w.count >= goal ? " met" : ""}`} style={{ height: `${(w.count / top) * 100}%` }}>
                  {w.count > 0 ? w.count : ""}
                </div>
                <span>{new Date(w.week).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" })}</span>
              </div>
            ))}
          </div>
          <form action={setWeeklyGoal} className="inline-form" style={{ marginTop: 16 }}>
            <label style={{ flex: "0 1 160px" }}>
              Weekly goal
              <input type="number" name="goal" min={1} max={100} defaultValue={goal} required />
            </label>
            <button className="btn secondary">Save goal</button>
          </form>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 16 }} aria-labelledby="sources-h">
        <h2 id="sources-h">Response rate by source</h2>
        {sources.length === 0 ? (
          <p className="muted">Move an application to Applied to start measuring.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th className="num">Applied</th>
                  <th className="num">Replied</th>
                  <th className="num">Response rate</th>
                  <th className="num">Median time to reply</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.source}>
                    <td>{s.source}</td>
                    <td className="num">{s.applied}</td>
                    <td className="num">{s.replied}</td>
                    <td className="num">{pct(s.rate)}</td>
                    <td className="num">{days(s.medianDays)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
