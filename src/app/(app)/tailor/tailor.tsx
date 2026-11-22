"use client";

import { useActionState, useDeferredValue, useEffect, useMemo, useState } from "react";
import { aiRewrite } from "@/app/actions.ts";
import { gapReport, type TermHit } from "@/lib/keywords.ts";

interface Job {
  id: number;
  label: string;
  description: string;
}

const RESUME_KEY = "offerlog.resume";

function Chips({ items, kind }: { items: TermHit[]; kind: "hit" | "miss" | "plain" }) {
  if (items.length === 0) return <p className="muted small">None</p>;
  return (
    <ul className="chips">
      {items.map((t) => (
        <li key={t.name} className={`chip ${kind}`}>
          {t.name}
          {t.count > 1 && <small>×{t.count}</small>}
        </li>
      ))}
    </ul>
  );
}

export function Tailor({ jobs, initialJob, ai }: { jobs: Job[]; initialJob: number | null; ai: boolean }) {
  const [jd, setJd] = useState(() => jobs.find((j) => j.id === initialJob)?.description ?? "");
  const [resume, setResume] = useState("");
  const [state, action, pending] = useActionState(aiRewrite, {});

  // The resume is kept in this browser only, as a convenience between visits.
  useEffect(() => {
    try {
      setResume(localStorage.getItem(RESUME_KEY) ?? "");
    } catch {}
  }, []);
  function updateResume(v: string) {
    setResume(v);
    try {
      localStorage.setItem(RESUME_KEY, v);
    } catch {}
  }

  const djd = useDeferredValue(jd);
  const dresume = useDeferredValue(resume);
  const report = useMemo(() => (djd.trim() && dresume.trim() ? gapReport(djd, dresume) : null), [djd, dresume]);

  return (
    <>
      <div className="tailor-inputs">
        <label>
          Job description
          {jobs.length > 0 && (
            <select
              aria-label="Load a job description from an application"
              defaultValue={initialJob ?? ""}
              onChange={(e) => setJd(jobs.find((j) => j.id === Number(e.target.value))?.description ?? "")}
            >
              <option value="">Paste below, or load one from an application…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
            </select>
          )}
          <textarea maxLength={30000} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job posting here" />
        </label>
        <label>
          Your resume
          <textarea maxLength={30000} value={resume} onChange={(e) => updateResume(e.target.value)} placeholder="Paste your resume as plain text or Markdown" />
        </label>
      </div>

      {report ? (
        <div className="grid-2" style={{ marginTop: 16 }}>
          <section className="panel" aria-labelledby="gap-h">
            <h2 id="gap-h">Keyword gaps</h2>
            {report.coverage !== null && (
              <>
                <div className="coverage" role="img" aria-label={`${Math.round(report.coverage * 100)}% covered`}>
                  <div style={{ width: `${report.coverage * 100}%` }} />
                </div>
                <p className="small muted">
                  Your resume mentions {Math.round(report.coverage * 100)}% of the skills and tools this posting names.
                </p>
              </>
            )}
            <h3 style={{ marginTop: 16 }}>Missing skills</h3>
            <Chips items={report.skills.missing} kind="miss" />
            <h3 style={{ marginTop: 16 }}>Missing tools</h3>
            <Chips items={report.tools.missing} kind="miss" />
            <h3 style={{ marginTop: 16 }}>Already covered</h3>
            <Chips items={[...report.skills.matched, ...report.tools.matched]} kind="hit" />
          </section>
          <section className="panel" aria-labelledby="other-h">
            <h2 id="other-h">Wording and level</h2>
            <h3>Seniority words in the posting</h3>
            <p className="small" style={{ marginTop: 6 }}>
              {report.seniority.job.length ? report.seniority.job.join(", ") : "None found"}
            </p>
            <h3 style={{ marginTop: 14 }}>Seniority words in your resume</h3>
            <p className="small" style={{ marginTop: 6 }}>
              {report.seniority.resume.length ? report.seniority.resume.join(", ") : "None found"}
            </p>
            <h3 style={{ marginTop: 14 }}>Repeated posting words you never use</h3>
            <Chips items={report.otherTerms} kind="plain" />
          </section>
        </div>
      ) : (
        <p className="muted" style={{ marginTop: 16 }}>
          The report appears once both boxes have text.
        </p>
      )}

      <section className="panel" style={{ marginTop: 16 }} aria-labelledby="ai-h">
        <h2 id="ai-h">Rewrite bullet points</h2>
        {ai ? (
          <form action={action} style={{ display: "grid", gap: 12 }}>
            <input type="hidden" name="jobDescription" value={jd} />
            <input type="hidden" name="resume" value={resume} />
            <label>
              Bullets to rewrite, one per line
              <textarea name="bullets" rows={5} required maxLength={8000} placeholder="- Built a course planner used by 300 students" />
            </label>
            <p className="small muted">
              Sends the job description and these bullets to the Anthropic API. The model is told not to invent experience; check every line
              before you use it.
            </p>
            <div>
              <button className="btn" disabled={pending || !jd.trim()}>
                {pending ? "Rewriting…" : "Rewrite with Claude"}
              </button>
            </div>
            {state.error && (
              <p className="error" role="alert">
                {state.error}
              </p>
            )}
            {state.text && <div className="ai-output">{state.text}</div>}
          </form>
        ) : (
          <p className="muted">
            Optional: set <code>ANTHROPIC_API_KEY</code> on the server to get suggested rewrites of your bullet points. Everything else on
            this page works without it.
          </p>
        )}
      </section>
    </>
  );
}
