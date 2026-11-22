"use client";

import { saveQuestion } from "@/app/actions.ts";
import type { Question } from "@/db/schema.ts";
import { PREP_STAGES, QUESTION_CATEGORIES, STAGE_LABELS } from "@/lib/stages.ts";
import { SubmitButton } from "../submit-button.tsx";
import { useFormAction } from "../use-form-action.ts";

export function QuestionForm({ q }: { q?: Question }) {
  const { state, action, value, key } = useFormAction(saveQuestion);
  return (
    <form key={key} action={action}>
      {q && <input type="hidden" name="id" value={q.id} />}
      <div className="form-grid">
        <label className="wide">
          Question
          <input name="question" required defaultValue={value("question", q?.question)} maxLength={2000} />
        </label>
        <label>
          Category
          <select name="category" defaultValue={value("category", q?.category ?? "behavioral")}>
            {QUESTION_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Asked at
          <select name="stage" defaultValue={value("stage", q?.stage ?? "interview")}>
            {PREP_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          Your answer notes
          <textarea name="answer" rows={3} maxLength={20000} defaultValue={value("answer", q?.answer)} placeholder="Bullet points, a STAR outline, links to revisit…" />
        </label>
      </div>
      <div className="form-actions">
        <SubmitButton>{q ? "Save question" : "Add question"}</SubmitButton>
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
