import Link from "next/link";
import { notFound } from "next/navigation";
import { addContact, addNote, completeNextStep, deleteApplication, deleteContact, deleteNote } from "@/app/actions.ts";
import { db } from "@/db/index.ts";
import { getApplication, listQuestions } from "@/lib/data.ts";
import { due, money, place, shortDate, today } from "@/lib/format.ts";
import { requireUser } from "@/lib/session.ts";
import { PREP_STAGES, STAGE_LABELS, type Stage } from "@/lib/stages.ts";
import { ApplicationForm } from "../../application-form.tsx";
import { StagePill } from "../../stage-pill.tsx";

type Entry =
  | { kind: "event"; key: string; at: string; from: Stage | null; to: Stage }
  | { kind: "note"; key: string; at: string; id: number; body: string };

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const appId = Number((await params).id);
  const detail = Number.isSafeInteger(appId) ? getApplication(db(), appId) : null;
  if (!detail) notFound();
  const { app, contacts, notes, events } = detail;
  const stage = app.stage as Stage;

  const timeline: Entry[] = [
    ...events.map((e) => ({ kind: "event" as const, key: `e${e.id}`, at: e.at, from: e.fromStage as Stage | null, to: e.toStage as Stage })),
    ...notes.filter((n) => !n.stage).map((n) => ({ kind: "note" as const, key: `n${n.id}`, at: n.createdAt, id: n.id, body: n.body })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const questions = listQuestions(db());
  const salary = money(app.salaryMin, app.salaryMax, app.currency);
  const nextDue = app.nextStepDue ? due(app.nextStepDue, today()) : null;

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
              <span style={{ flex: 1 }}>{app.nextStep}</span>
              {nextDue && <span className={`due ${nextDue.state}`}>{nextDue.label}</span>}
              <form action={completeNextStep}>
                <input type="hidden" name="id" value={app.id} />
                <button className="btn secondary">Mark done</button>
              </form>
            </div>
          )}

          <section className="panel" aria-labelledby="timeline-h">
            <h2 id="timeline-h">Timeline</h2>
            <form action={addNote} className="inline-form" style={{ marginBottom: 20 }}>
              <input type="hidden" name="applicationId" value={app.id} />
              <label>
                <span className="sr-only">New note</span>
                <textarea name="body" rows={2} required placeholder="Add a dated note: a call, an email, how it went…" />
              </label>
              <button className="btn">Add note</button>
            </form>
            <ol className="timeline">
              {timeline.map((t) => (
                <li key={t.key}>
                  <time dateTime={t.at}>{shortDate(t.at)}</time>
                  {t.kind === "event" ? (
                    <>
                      <span className="stage-dot mark" style={{ "--stage": `var(--st-${t.to})` } as React.CSSProperties} />
                      <span className="body">
                        {t.from ? (
                          <>
                            Moved from {STAGE_LABELS[t.from]} to <strong>{STAGE_LABELS[t.to]}</strong>
                          </>
                        ) : (
                          <>
                            Added as <strong>{STAGE_LABELS[t.to]}</strong>
                          </>
                        )}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="note-mark mark" />
                      <span className="body">
                        {t.body}{" "}
                        <form action={deleteNote} style={{ display: "inline" }}>
                          <input type="hidden" name="id" value={t.id} />
                          <input type="hidden" name="applicationId" value={app.id} />
                          <button className="linklike small" aria-label="Delete note">
                            Delete
                          </button>
                        </form>
                      </span>
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
                <button className="btn" style={{ background: "var(--danger)", borderColor: "var(--danger)" }}>
                  Delete application
                </button>
              </form>
            </details>
          </section>
        </div>

        <div>
          <section className="panel" aria-labelledby="contacts-h">
            <h2 id="contacts-h">Contacts</h2>
            {contacts.length > 0 && (
              <ul className="list" style={{ marginBottom: 16 }}>
                {contacts.map((c) => (
                  <li key={c.id}>
                    <span>
                      <strong>{c.name}</strong>
                      {c.title && <span className="muted">, {c.title}</span>}
                      <br />
                      <span className="small">
                        {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
                        {c.email && c.url && " "}
                        {c.url && (
                          <a href={c.url} target="_blank" rel="noopener noreferrer">
                            Profile
                          </a>
                        )}
                      </span>
                    </span>
                    <form action={deleteContact}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="applicationId" value={app.id} />
                      <button className="linklike small" aria-label={`Remove ${c.name}`}>
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <details open={contacts.length === 0}>
              <summary>Add a contact</summary>
              <form action={addContact} style={{ display: "grid", gap: 10 }}>
                <input type="hidden" name="applicationId" value={app.id} />
                <label>
                  Name
                  <input name="name" required maxLength={200} />
                </label>
                <label>
                  Title
                  <input name="title" placeholder="Recruiter, hiring manager…" maxLength={200} />
                </label>
                <label>
                  Email
                  <input name="email" type="email" maxLength={200} />
                </label>
                <label>
                  Profile link
                  <input name="url" type="url" placeholder="https://" maxLength={2000} />
                </label>
                <button className="btn secondary" style={{ justifySelf: "start" }}>
                  Add contact
                </button>
              </form>
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
                    <ul className="list" style={{ margin: "10px 0" }}>
                      {prep.map((n) => (
                        <li key={n.id}>
                          <span style={{ whiteSpace: "pre-wrap" }}>{n.body}</span>
                          <form action={deleteNote}>
                            <input type="hidden" name="id" value={n.id} />
                            <input type="hidden" name="applicationId" value={app.id} />
                            <button className="linklike small" aria-label="Delete prep note">
                              Delete
                            </button>
                          </form>
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
                  <form action={addNote} className="inline-form" style={{ marginTop: 10 }}>
                    <input type="hidden" name="applicationId" value={app.id} />
                    <input type="hidden" name="stage" value={s} />
                    <label>
                      <span className="sr-only">Prep note for {STAGE_LABELS[s]}</span>
                      <input name="body" required placeholder={`Prep note for ${STAGE_LABELS[s].toLowerCase()}`} />
                    </label>
                    <button className="btn secondary">Add</button>
                  </form>
                </div>
              );
            })}
          </section>
        </div>
      </div>
    </>
  );
}
