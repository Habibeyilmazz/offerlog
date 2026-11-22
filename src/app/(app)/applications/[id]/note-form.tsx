"use client";

import { addNote, updateNote } from "@/app/actions.ts";
import { useFormAction } from "../../use-form-action.ts";

/** Adds a note (`id` absent) or edits one; keeps the text when the save fails. `children` are the submit buttons. */
export function NoteForm(props: {
  appId: number;
  id?: number;
  stage?: string;
  body?: string;
  label: string;
  placeholder?: string;
  rows?: number;
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const { appId, id, stage, body, label, placeholder, rows, className, style, children } = props;
  const { state, action, value, key } = useFormAction(id ? updateNote : addNote);
  const field = { name: "body", required: true, maxLength: 20000, placeholder, defaultValue: value("body", body) };
  return (
    <form key={key} action={action} className={className} style={style}>
      {id && <input type="hidden" name="id" value={id} />}
      <input type="hidden" name="applicationId" value={appId} />
      {stage && <input type="hidden" name="stage" value={stage} />}
      <label>
        <span className="sr-only">{label}</span>
        {rows ? <textarea rows={rows} {...field} /> : <input {...field} />}
      </label>
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      {children}
    </form>
  );
}
