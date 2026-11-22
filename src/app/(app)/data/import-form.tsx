"use client";

import { useActionState } from "react";
import { importFile } from "@/app/actions.ts";
import { SubmitButton } from "../submit-button.tsx";

export function ImportForm() {
  const [state, action, pending] = useActionState(importFile, {});
  return (
    <form action={action} style={{ display: "grid", gap: 12 }}>
      <label>
        CSV or JSON file
        <input type="file" name="file" accept=".csv,.json,text/csv,application/json" required />
      </label>
      <div className="form-actions" style={{ marginTop: 0 }}>
        <SubmitButton>{pending ? "Importing…" : "Import file"}</SubmitButton>
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
