"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { aiRewrite, jobDescription } from "@/app/actions.ts";
import { gapReport, type TermHit } from "@/lib/keywords.ts";
import { useFormAction } from "../use-form-action.ts";

interface Job {
  id: number;
  label: string;
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

export function Tailor({ jobs, initialJob, ai }: { jobs: Job[]; initialJob: { id: number; description: string } | null; ai: boolean }) {
  const [jd, setJd] = useState(initialJob?.description ?? "");
  const [jobError, setJobError] = useState("");
  const picked = useRef("");
  const [resume, setResume] = useState("");
  // Keeps the pasted bullets, and the page, when the API refuses or the connection drops.
  const { state, action, pending, value, key } = useFormAction(aiRewrite);

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

  async function pickJob(v: string) {
    picked.current = v;
    setJobError("");
    if (!v) return setJd("");
    try {
      const text = await jobDescription(Number(v));
      if (picked.current === v) setJd(text); // a slower answer for an earlier pick must not win
    } catch {
      if (picked.current === v) setJobError("Could not load that job description. Check your connection and pick it again.");
    }
  }

  const djd = useDeferredValue(jd);
  const dresume = useDeferredValue(resume);
  const report = useMemo(() => (djd.trim() && dresume.trim() ? gapReport(djd, dresume) : null), [djd, dresume]);

  return (
    <>
      {jobs.length > 0 && (
        <label className="job-picker">
          Load a job description from an application
          <select defaultValue={initialJob?.id ?? ""} onChange={(e) => pickJob(e.target.value)}>
            <option value="">None, I will paste one</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {jobError && (
        <p className="error" role="alert">
          {jobError}
        </p>
      )}
      <div className="tailor-inputs">
        <label>
          Job description
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
          <form key={key} action={action} style={{ display: "grid", gap: 12 }}>
            <input type="hidden" name="jobDescription" value={jd} />
            <input type="hidden" name="resume" value={resume} />
            <label>
              Bullets to rewrite, one per line
              <textarea name="bullets" rows={5} required maxLength={8000} defaultValue={value("bullets")} placeholder="- Built a course planner used by 300 students" />
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
