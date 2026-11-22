"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions.ts";

type State = FormState & { values?: Record<string, FormDataEntryValue>; done?: number };

const UNREACHABLE = "That did not go through: the connection dropped or the server failed. Check your connection and try again.";

/**
 * useActionState for a form whose server action returns FormState. On an error (a refused field, or no connection)
 * the submitted values come back through `value` to refill the form. Give the form `key={key}`: React's own reset
 * after an action puts a <select> back to its first default, so the form is remounted with the right defaults instead.
 */
export function useFormAction(act: (prev: FormState, form: FormData) => Promise<FormState>) {
  const [state, action, pending] = useActionState(async (prev: State, form: FormData): Promise<State> => {
    let res: FormState | undefined;
    try {
      res = await act(prev, form);
    } catch {
      res = { error: UNREACHABLE };
    }
    // `res` is undefined for an action that returns nothing (one that redirects on success).
    const done = (prev.done ?? 0) + 1;
    return res?.error ? { ...res, values: Object.fromEntries(form), done } : { ...res, done };
  }, {});
  /** What was submitted for `name` if the last save failed, else `fallback` (the saved value). */
  const value = (name: string, fallback?: string | number | null) => String(state.values?.[name] ?? fallback ?? "");
  return { state, action, pending, value, key: state.done ?? 0 };
}
