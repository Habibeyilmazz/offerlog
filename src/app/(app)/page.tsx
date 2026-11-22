import Link from "next/link";
import { loadDemoData, moveApplication, scheduleFollowUp } from "@/app/actions.ts";
import { db } from "@/db/index.ts";
import { lastActivity, listApplications } from "@/lib/data.ts";
import { FOLLOW_UP_DAYS, waitingOnReply } from "@/lib/followup.ts";
import { due, money, place, plural, today } from "@/lib/format.ts";
import { isEmptyTracker } from "@/lib/seed.ts";
import { requireUser } from "@/lib/session.ts";
import { STAGE_LABELS, STAGES, type Stage } from "@/lib/stages.ts";
import { Board, type CardData } from "./board.tsx";
import { SubmitButton } from "./submit-button.tsx";

export const metadata = { title: "Board" };

export default async function BoardPage() {
  await requireUser();
  const apps = listApplications(db());
  const canDemo = apps.length === 0 && isEmptyTracker(db());
  const now = today();
  const cards: CardData[] = apps.map((a) => ({
    id: a.id,
    company: a.company,
    role: a.role,
    stage: a.stage as Stage,
    salary: money(a.salaryMin, a.salaryMax, a.currency),
    where: place(a.location, a.workMode),
    source: a.source,
    due: a.nextStepDue && a.nextStep ? due(a.nextStepDue, now) : null,
  }));
  const upNext = apps
    .filter((a) => a.nextStep && a.nextStepDue && STAGES.indexOf(a.stage as Stage) < STAGES.indexOf("rejected"))
    .sort((a, b) => (a.nextStepDue as string).localeCompare(b.nextStepDue as string))
    .slice(0, 8);
  const waiting = waitingOnReply(apps, lastActivity(db()), now);
  const shown = waiting.slice(0, 8);
  const active = apps.filter((a) => !["wishlist", "rejected", "ghosted"].includes(a.stage)).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Board</h1>
          <p className="muted">
            {apps.length === 0 ? "Nothing tracked yet." : `${plural(apps.length, "application")}, ${active} in progress. Drag a card or use its menu to move it.`}
          </p>
        </div>
        <Link href="/applications/new" className="btn">
          Add application
        </Link>
      </div>

      {apps.length === 0 && (
        <div className="panel" style={{ maxWidth: 560, marginBottom: 24 }}>
          <h2>Start your log</h2>
          <p className="muted" style={{ margin: "8px 0 16px" }}>
            {canDemo
              ? "Add the first job you are eyeing, import a CSV or JSON file, or explore with fictional demo data."
              : "Add the first job you are eyeing, or import a CSV or JSON file. Demo data is only offered while the question bank is empty too, so it cannot replace your questions."}
          </p>
          <div className="form-actions" style={{ marginTop: 0 }}>
            <Link href="/applications/new" className="btn">
              Add application
            </Link>
            {canDemo && (
              <form>
                <SubmitButton className="btn secondary" formAction={loadDemoData}>
                  Load demo data
                </SubmitButton>
              </form>
            )}
            <Link href="/data">Import a file</Link>
          </div>
        </div>
      )}

      {upNext.length > 0 && (
        <section aria-labelledby="upnext-h">
          <h2 id="upnext-h" style={{ marginBottom: 10 }}>
            Up next
          </h2>
          <div className="upnext">
            {upNext.map((a) => {
              const d = due(a.nextStepDue as string, now);
              return (
                <Link key={a.id} href={`/applications/${a.id}`} className={d.state === "overdue" ? "overdue" : undefined}>
                  <span>
                    <strong>{a.company}</strong> <span className={`due ${d.state}`}>{d.label}</span>
                  </span>
                  <span className="what">{a.nextStep}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {waiting.length > 0 && (
        <section aria-labelledby="waiting-h">
          <h2 id="waiting-h">Waiting on a reply</h2>
          <p className="muted section-lede">
            No news for {FOLLOW_UP_DAYS} days or more. Plan a follow-up for today, or mark it ghosted.
            {waiting.length > shown.length && ` Showing the ${shown.length} longest waits of ${waiting.length}.`}
          </p>
          <ul className="upnext">
            {shown.map(({ app: a, days }) => (
              <li key={a.id}>
                <Link href={`/applications/${a.id}`}>
                  <strong>{a.company}</strong>
                </Link>
                <span className="what">
                  {STAGE_LABELS[a.stage as Stage]}, no news for {days} days
                </span>
                <form>
                  <SubmitButton className="btn secondary" formAction={scheduleFollowUp.bind(null, a.id)} aria-label={`Follow up with ${a.company}`}>
                    Follow up
                  </SubmitButton>
                  <SubmitButton className="btn secondary" formAction={moveApplication.bind(null, a.id, "ghosted")} aria-label={`Mark ghosted, ${a.company}`}>
                    Mark ghosted
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Board cards={cards} />
    </>
  );
}
