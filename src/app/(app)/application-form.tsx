"use client";

import { useActionState } from "react";
import { saveApplication } from "@/app/actions.ts";
import type { Application } from "@/db/schema.ts";
import { STAGE_LABELS, STAGES, WORK_MODES } from "@/lib/stages.ts";

export function ApplicationForm({ app }: { app?: Application }) {
  const [state, action, pending] = useActionState(saveApplication, {});
  return (
    <form action={action}>
      {app && <input type="hidden" name="id" value={app.id} />}
      <div className="form-grid">
        <label>
          Company
          <input name="company" required defaultValue={app?.company} maxLength={200} />
        </label>
        <label>
          Role
          <input name="role" required defaultValue={app?.role} maxLength={200} />
        </label>
        <label>
          Stage
          <select name="stage" defaultValue={app?.stage ?? "wishlist"}>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Source
          <input name="source" defaultValue={app?.source} placeholder="Referral, LinkedIn, career fair…" maxLength={80} list="sources" />
          <datalist id="sources">
            {["Referral", "LinkedIn", "Company site", "University career fair", "Wellfound", "Hacker News"].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="wide">
          Job posting link
          <input name="url" type="url" defaultValue={app?.url} placeholder="https://" maxLength={2000} />
        </label>
        <label>
          Salary from
          <input name="salaryMin" inputMode="numeric" defaultValue={app?.salaryMin ?? ""} placeholder="50000 or 50k" />
        </label>
        <label>
          Salary to
          <input name="salaryMax" inputMode="numeric" defaultValue={app?.salaryMax ?? ""} />
        </label>
        <label>
          Currency
          <input name="currency" defaultValue={app?.currency ?? "USD"} maxLength={3} style={{ textTransform: "uppercase" }} />
        </label>
        <label>
          Location
          <input name="location" defaultValue={app?.location} maxLength={200} />
        </label>
        <label>
          Work mode
          <select name="workMode" defaultValue={app?.workMode ?? "onsite"}>
            {WORK_MODES.map((m) => (
              <option key={m} value={m}>
                {m[0].toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          Next step
          <input name="nextStep" defaultValue={app?.nextStep} placeholder="Follow up with the recruiter" maxLength={300} />
        </label>
        <label>
          Next step due
          <input name="nextStepDue" type="date" defaultValue={app?.nextStepDue ?? ""} />
        </label>
        <label className="wide">
          Job description
          <textarea name="description" rows={6} maxLength={20000} defaultValue={app?.description} placeholder="Paste the posting to use it in the resume tailor." />
        </label>
      </div>
      {state.error && (
        <p className="error" role="alert" style={{ marginTop: 14 }}>
          {state.error}
        </p>
      )}
      <div className="form-actions">
        <button className="btn" disabled={pending}>
          {app ? "Save changes" : "Add application"}
        </button>
      </div>
    </form>
  );
}
