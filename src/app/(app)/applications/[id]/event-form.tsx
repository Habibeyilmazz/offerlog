"use client";

import { removeEvent, updateEventDate } from "@/app/actions.ts";
import { SubmitButton } from "../../submit-button.tsx";
import { useFormAction } from "../../use-form-action.ts";

/** Change the date of a stage change, or remove one made by mistake (never the first entry). */
export function EventForm({ id, day, max, first, revertTo }: { id: number; day: string; max: string; first: boolean; revertTo?: string }) {
  const { state, action, value, key } = useFormAction(updateEventDate);
  return (
    <form key={key} action={action} className="edit-form">
      <input type="hidden" name="id" value={id} />
      <label>
        Date
        <input type="date" name="date" required defaultValue={value("date", day)} max={max} />
      </label>
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      <div className="edit-actions">
        <SubmitButton className="btn secondary">Save date</SubmitButton>
        {!first && (
          <SubmitButton className="linklike danger" formAction={removeEvent} formNoValidate>
            Remove this change
          </SubmitButton>
        )}
      </div>
      {revertTo && <p className="small muted">Removing it moves the application back to {revertTo}.</p>}
    </form>
  );
}
