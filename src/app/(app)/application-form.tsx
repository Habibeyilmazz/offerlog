"use client";

import { saveApplication } from "@/app/actions.ts";
import type { Application } from "@/db/schema.ts";
import { STAGE_LABELS, STAGES, WORK_MODES } from "@/lib/stages.ts";
import { SubmitButton } from "./submit-button.tsx";
import { useFormAction } from "./use-form-action.ts";

export function ApplicationForm({ app }: { app?: Application }) {
  const { state, action, value, key } = useFormAction(saveApplication);
  return (
    <form key={key} action={action}>
      {app && <input type="hidden" name="id" value={app.id} />}
      <div className="form-grid">
        <label>
          Company
          <input name="company" required defaultValue={value("company", app?.company)} maxLength={200} />
        </label>
        <label>
          Role
          <input name="role" required defaultValue={value("role", app?.role)} maxLength={200} />
        </label>
        <label>
          Stage
          <select name="stage" defaultValue={value("stage", app?.stage ?? "wishlist")}>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        {!app && (
          <div style={{ display: "grid", gap: 4 }}>
            <label>
              Date
              <input name="stageDate" type="date" defaultValue={value("stageDate")} aria-describedby="stage-date-hint" />
            </label>
            <span id="stage-date-hint" className="small muted">
              When it reached this stage, if not today.
            </span>
          </div>
        )}
        <label>
          Source
          <input name="source" defaultValue={value("source", app?.source)} placeholder="Referral, LinkedIn, career fair…" maxLength={80} list="sources" />
          <datalist id="sources">
            {["Referral", "LinkedIn", "Company site", "University career fair", "Wellfound", "Hacker News"].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="wide">
          Job posting link
          <input name="url" type="url" defaultValue={value("url", app?.url)} placeholder="https://" maxLength={2000} />
        </label>
        <label>
          Salary from
          <input name="salaryMin" inputMode="numeric" defaultValue={value("salaryMin", app?.salaryMin ?? "")} placeholder="50000 or 50k" />
        </label>
        <label>
          Salary to
          <input name="salaryMax" inputMode="numeric" defaultValue={value("salaryMax", app?.salaryMax ?? "")} />
        </label>
        <label>
          Currency
          <input name="currency" defaultValue={value("currency", app?.currency ?? "USD")} maxLength={3} style={{ textTransform: "uppercase" }} />
        </label>
        <label>
          Location
          <input name="location" defaultValue={value("location", app?.location)} maxLength={200} />
        </label>
        <label>
          Work mode
          <select name="workMode" defaultValue={value("workMode", app?.workMode ?? "onsite")}>
            {WORK_MODES.map((m) => (
              <option key={m} value={m}>
                {m[0].toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          Next step
          <input name="nextStep" defaultValue={value("nextStep", app?.nextStep)} placeholder="Follow up with the recruiter" maxLength={300} />
        </label>
        <label>
          Next step due
          <input name="nextStepDue" type="date" defaultValue={value("nextStepDue", app?.nextStepDue ?? "")} />
        </label>
        <label className="wide">
          Job description
          <textarea name="description" rows={6} maxLength={20000} defaultValue={value("description", app?.description)} placeholder="Paste the posting to use it in the resume tailor." />
        </label>
      </div>
      {state.error && (
        <p className="error" role="alert" style={{ marginTop: 14 }}>
          {state.error}
        </p>
      )}
      <div className="form-actions">
        <SubmitButton>{app ? "Save changes" : "Add application"}</SubmitButton>
      </div>
    </form>
  );
}
