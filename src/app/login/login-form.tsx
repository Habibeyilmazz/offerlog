"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/app/(app)/submit-button.tsx";
import { login } from "./actions.ts";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} style={{ display: "grid", gap: 14 }}>
      <label>
        Password
        <input type="password" name="password" autoComplete="current-password" required autoFocus />
      </label>
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton>{pending ? "Signing in…" : "Sign in"}</SubmitButton>
    </form>
  );
}
