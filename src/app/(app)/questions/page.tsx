import Link from "next/link";
import { deleteQuestion } from "@/app/actions.ts";
import { db } from "@/db/index.ts";
import { listQuestions } from "@/lib/data.ts";
import { requireUser } from "@/lib/session.ts";
import { isStage, PREP_STAGES, QUESTION_CATEGORIES, STAGE_LABELS } from "@/lib/stages.ts";
import { StagePill } from "../stage-pill.tsx";
import { QuestionForm } from "./question-form.tsx";

export const metadata = { title: "Question bank" };

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  await requireUser();
  const { stage } = await searchParams;
  const filter = isStage(stage) ? stage : null;
  const all = listQuestions(db());
  const shown = filter ? all.filter((q) => q.stage === filter) : all;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Question bank</h1>
          <p className="muted">Questions you were asked or expect, with your answer notes. They show up in each application&apos;s prep section for the matching stage.</p>
        </div>
      </div>

      <div className="detail">
        <div>
          <nav aria-label="Filter by stage" className="facts" style={{ marginTop: 0, marginBottom: 14 }}>
            <Link href="/questions" aria-current={!filter ? "page" : undefined} style={{ fontWeight: !filter ? 700 : 400 }}>
              All ({all.length})
            </Link>
            {PREP_STAGES.map((s) => (
              <Link key={s} href={`/questions?stage=${s}`} aria-current={filter === s ? "page" : undefined} style={{ fontWeight: filter === s ? 700 : 400 }}>
                {STAGE_LABELS[s]} ({all.filter((q) => q.stage === s).length})
              </Link>
            ))}
          </nav>
          {shown.length === 0 && (
            <div className="panel">
              <p className="muted">No questions here yet. Add the first one with the form.</p>
            </div>
          )}
          {QUESTION_CATEGORIES.map((cat) => {
            const qs = shown.filter((q) => q.category === cat);
            if (qs.length === 0) return null;
            return (
              <section key={cat} className="panel" aria-label={cat}>
                <h2>{cat[0].toUpperCase() + cat.slice(1)}</h2>
                <ul className="list">
                  {qs.map((q) => (
                    <li key={q.id} style={{ display: "block", borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                      <details>
                        <summary>
                          <span style={{ fontWeight: 600 }}>{q.question}</span> <StagePill stage={isStage(q.stage) ? q.stage : "interview"} />
                        </summary>
                        {q.answer && <p style={{ whiteSpace: "pre-wrap", marginBottom: 14 }}>{q.answer}</p>}
                        <QuestionForm q={q} />
                        <form action={deleteQuestion} style={{ marginTop: 10 }}>
                          <input type="hidden" name="id" value={q.id} />
                          <button className="linklike danger small">Delete question</button>
                        </form>
                      </details>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        <section className="panel" aria-labelledby="add-q">
          <h2 id="add-q">Add a question</h2>
          <QuestionForm />
        </section>
      </div>
    </>
  );
}
