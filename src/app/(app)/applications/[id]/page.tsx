import Link from "next/link";
import { notFound } from "next/navigation";
import { completeNextStep, deleteApplication, deleteNote } from "@/app/actions.ts";
import { db } from "@/db/index.ts";
import { getApplication, listQuestions } from "@/lib/data.ts";
import { due, money, place, shortDate, today } from "@/lib/format.ts";
import { requireUser } from "@/lib/session.ts";
import { PREP_STAGES, STAGE_LABELS, type Stage } from "@/lib/stages.ts";
import { ApplicationForm } from "../../application-form.tsx";
import { StagePill } from "../../stage-pill.tsx";
import { SubmitButton } from "../../submit-button.tsx";
import { ContactForm } from "./contact-form.tsx";
import { EventForm } from "./event-form.tsx";
import { NoteForm } from "./note-form.tsx";

type Entry =
  | { kind: "event"; key: string; at: string; id: number; from: Stage | null; to: Stage }
  | { kind: "note"; key: string; at: string; id: number; body: string };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  // Metadata renders independently of the layout and page, so it needs its own session check.
  await requireUser();
  const appId = Number((await params).id);
  const detail = Number.isSafeInteger(appId) ? getApplication(db(), appId) : null;
  return { title: detail ? `${detail.app.company}, ${detail.app.role}` : "Not found" };
}

/** Edit panel for a note: the text plus Save and Delete. Keyed by the text, so a saved edit closes it. */
function NoteEditor({ id, appId, body, what }: { id: number; appId: number; body: string; what: string }) {
  return (
    <details className="edit" key={body}>
      <summary>
        Edit<span className="sr-only"> {what}</span>
      </summary>
      <NoteForm id={id} appId={appId} body={body} label={`Text of the ${what}`} rows={3} className="edit-form">
        <div className="edit-actions">
          <SubmitButton className="btn secondary">Save</SubmitButton>
          <SubmitButton className="linklike danger" formAction={deleteNote} formNoValidate>
            Delete {what}
          </SubmitButton>
        </div>
      </NoteForm>
    </details>
  );
}

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const appId = Number((await params).id);
  const detail = Number.isSafeInteger(appId) ? getApplication(db(), appId) : null;
  if (!detail) notFound();
  const { app, contacts, notes, events } = detail;
  const stage = app.stage as Stage;

  const timeline: Entry[] = [
    ...events.map((e) => ({ kind: "event" as const, key: `e${e.id}`, at: e.at, id: e.id, from: e.fromStage as Stage | null, to: e.toStage as Stage })),
    ...notes.filter((n) => !n.stage).map((n) => ({ kind: "note" as const, key: `n${n.id}`, at: n.createdAt, id: n.id, body: n.body })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const firstEvent = events[0]?.id;
  const lastEvent = events.at(-1)?.id;
  const todayIso = today();
  const questions = listQuestions(db());
  const salary = money(app.salaryMin, app.salaryMax, app.currency);
  const nextDue = app.nextStepDue ? due(app.nextStepDue, todayIso) : null;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="small">
            <Link href="/">Board</Link>
          </p>
          <h1>{app.company}</h1>
          <p style={{ fontSize: "1.05rem" }}>{app.role}</p>
          <div className="facts">
            <StagePill stage={stage} />
            {salary && <span>{salary}</span>}
            {place(app.location, app.workMode) && <span>{place(app.location, app.workMode)}</span>}
            {app.source && <span>Found via {app.source}</span>}
            {app.url && (
              <a href={app.url} target="_blank" rel="noopener noreferrer">
                Job posting
              </a>
            )}
            <span>Added {shortDate(app.createdAt)}</span>
          </div>
        </div>
        {app.description && (
          <Link href={`/tailor?app=${app.id}`} className="btn secondary">
            Tailor resume for this job
          </Link>
        )}
      </div>

      <div className="detail">
        <div>
          {app.nextStep && (
            <div className="nextstep">
              <strong>Next step</strong>
              <span className="what">{app.nextStep}</span>
              {nextDue && <span className={`due ${nextDue.state}`}>{nextDue.label}</span>}
              <form action={completeNextStep}>
                <input type="hidden" name="id" value={app.id} />
                <SubmitButton className="btn secondary">Mark done</SubmitButton>
              </form>
            </div>
          )}

          <section className="panel" aria-labelledby="timeline-h">
            <h2 id="timeline-h">Timeline</h2>
            <NoteForm
              appId={app.id}
              label="New note"
              rows={2}
              placeholder="Add a dated note: a call, an email, how it went…"
              className="inline-form"
              style={{ marginBottom: 20 }}
            >
              <SubmitButton>Add note</SubmitButton>
            </NoteForm>
            <ol className="timeline">
              {timeline.map((t) => (
                <li key={t.key}>
                  <time dateTime={t.at}>{shortDate(t.at)}</time>
                  {t.kind === "event" ? (
                    <>
                      <span className="stage-dot mark" style={{ "--stage": `var(--st-${t.to})` } as React.CSSProperties} />
                      <div className="body">
                        <p>
                          {t.from ? (
                            <>
                              Moved from {STAGE_LABELS[t.from]} to <strong>{STAGE_LABELS[t.to]}</strong>
                            </>
                          ) : (
                            <>
                              Added as <strong>{STAGE_LABELS[t.to]}</strong>
                            </>
                          )}
                        </p>
                        {/* Keyed by the saved date, so a successful save closes the panel. */}
                        <details className="edit" key={t.at}>
                          <summary>
                            Edit<span className="sr-only"> {t.from ? `move to ${STAGE_LABELS[t.to]}` : `date added`}</span>
                          </summary>
                          <EventForm
                            id={t.id}
                            day={today(new Date(t.at))}
                            max={todayIso}
                            first={t.id === firstEvent}
                            revertTo={t.id === lastEvent && t.from ? STAGE_LABELS[t.from] : undefined}
                          />
                        </details>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="note-mark mark" />
                      <div className="body">
                        <p className="note-text">{t.body}</p>
                        <NoteEditor id={t.id} appId={app.id} body={t.body} what="note" />
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section className="panel">
            <details>
              <summary>Edit details</summary>
              <ApplicationForm app={app} />
            </details>
          </section>

          <section className="panel">
            <details>
              <summary>Delete this application</summary>
              <p className="muted" style={{ marginBottom: 12 }}>
                Removes {app.company} with its notes, contacts and history. This cannot be undone.
              </p>
              <form action={deleteApplication}>
                <input type="hidden" name="id" value={app.id} />
                <SubmitButton className="btn danger">Delete application</SubmitButton>
              </form>
            </details>
          </section>
        </div>

        <div>
          <section className="panel" aria-labelledby="contacts-h">
            <h2 id="contacts-h">Contacts</h2>
            {contacts.length > 0 && (
              <ul className="list contacts" style={{ marginBottom: 16 }}>
                {contacts.map((c) => (
                  <li key={c.id}>
                    <div>
                      <strong>{c.name}</strong>
                      {c.title && <span className="muted">, {c.title}</span>}
                    </div>
                    {(c.email || c.url) && (
                      <div className="small contact-links">
                        {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
                        {c.url && (
                          <a href={c.url} target="_blank" rel="noopener noreferrer">
                            Profile
                          </a>
                        )}
                      </div>
                    )}
                    {/* Keyed by the saved values, so a successful save closes the panel. */}
                    <details className="edit" key={`${c.name}|${c.title}|${c.email}|${c.url}`}>
                      <summary>
                        Edit<span className="sr-only"> {c.name}</span>
                      </summary>
                      <ContactForm appId={app.id} c={c} />
                    </details>
                  </li>
                ))}
              </ul>
            )}
            <details open={contacts.length === 0}>
              <summary>Add a contact</summary>
              <ContactForm appId={app.id} />
            </details>
          </section>

          <section className="panel" aria-labelledby="prep-h">
            <h2 id="prep-h">Interview prep</h2>
            {PREP_STAGES.map((s) => {
              const prep = notes.filter((n) => n.stage === s);
              const bank = questions.filter((q) => q.stage === s);
              return (
                <div key={s} className="prep-stage">
                  <h3>
                    <StagePill stage={s} />
                  </h3>
                  {prep.length > 0 && (
                    <ul className="list prep-notes">
                      {prep.map((n) => (
                        <li key={n.id}>
                          <p className="note-text">{n.body}</p>
                          <NoteEditor id={n.id} appId={app.id} body={n.body} what="prep note" />
                        </li>
                      ))}
                    </ul>
                  )}
                  {bank.length > 0 && (
                    <details>
                      <summary className="small">
                        {bank.length} {bank.length === 1 ? "question" : "questions"} from your bank
                      </summary>
                      <ul>
                        {bank.map((q) => (
                          <li key={q.id}>{q.question}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <NoteForm
                    appId={app.id}
                    stage={s}
                    label={`Prep note for ${STAGE_LABELS[s]}`}
                    placeholder={`Prep note for ${STAGE_LABELS[s].toLowerCase()}`}
                    className="inline-form"
                    style={{ marginTop: 10 }}
                  >
                    <SubmitButton className="btn secondary">
                      Add<span className="sr-only"> {STAGE_LABELS[s].toLowerCase()} prep note</span>
                    </SubmitButton>
                  </NoteForm>
                </div>
              );
            })}
          </section>
        </div>
      </div>
    </>
  );
}
