"use client";

import { useActionState } from "react";
import { saveQuestion } from "@/app/actions.ts";
import type { Question } from "@/db/schema.ts";
import { PREP_STAGES, QUESTION_CATEGORIES, STAGE_LABELS } from "@/lib/stages.ts";

export function QuestionForm({ q }: { q?: Question }) {
  const [state, action, pending] = useActionState(saveQuestion, {});
  return (
    <form action={action}>
      {q && <input type="hidden" name="id" value={q.id} />}
      <div className="form-grid">
        <label className="wide">
          Question
          <input name="question" required defaultValue={q?.question} maxLength={2000} />
        </label>
        <label>
          Category
          <select name="category" defaultValue={q?.category ?? "behavioral"}>
            {QUESTION_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Asked at
          <select name="stage" defaultValue={q?.stage ?? "interview"}>
            {PREP_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          Your answer notes
          <textarea name="answer" rows={3} defaultValue={q?.answer} placeholder="Bullet points, a STAR outline, links to revisit…" />
        </label>
      </div>
      <div className="form-actions">
        <button className="btn" disabled={pending}>
          {q ? "Save question" : "Add question"}
        </button>
        {state.error && (
          <span className="error" role="alert">
            {state.error}
          </span>
        )}
        {state.message && (
          <span className="ok" role="status">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
