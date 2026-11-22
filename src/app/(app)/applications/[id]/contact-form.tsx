"use client";

import { addContact, deleteContact, updateContact } from "@/app/actions.ts";
import { SubmitButton } from "../../submit-button.tsx";
import { useFormAction } from "../../use-form-action.ts";

type Contact = { id: number; name: string; title: string; email: string; url: string };

/** Add form, or edit form with Save and Remove when `c` is given. Shows the server's validation error and keeps what was typed. */
export function ContactForm({ appId, c }: { appId: number; c?: Contact }) {
  const { state, action, value, key } = useFormAction(c ? updateContact : addContact);
  const v = (k: keyof Contact) => value(k, c?.[k]);

  return (
    <form key={key} action={action} className={c ? "edit-form" : undefined} style={c ? undefined : { display: "grid", gap: 10 }}>
      {c && <input type="hidden" name="id" value={c.id} />}
      <input type="hidden" name="applicationId" value={appId} />
      <label>
        Name
        <input name="name" required maxLength={200} defaultValue={v("name")} />
      </label>
      <label>
        Title
        <input name="title" placeholder="Recruiter, hiring manager…" maxLength={200} defaultValue={v("title")} />
      </label>
      <label>
        Email
        <input name="email" type="email" maxLength={200} defaultValue={v("email")} />
      </label>
      <label>
        Profile link
        <input name="url" type="url" placeholder="https://" maxLength={2000} defaultValue={v("url")} />
      </label>
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      {c ? (
        <div className="edit-actions">
          <SubmitButton className="btn secondary">Save contact</SubmitButton>
          <SubmitButton className="linklike danger" formAction={deleteContact} formNoValidate>
            Remove {c.name}
          </SubmitButton>
        </div>
      ) : (
        <SubmitButton className="btn secondary" style={{ justifySelf: "start" }}>
          Add contact
        </SubmitButton>
      )}
    </form>
  );
}
