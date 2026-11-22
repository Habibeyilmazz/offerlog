"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions.ts";

type Extra = { values?: Record<string, FormDataEntryValue>; done?: number };

const UNREACHABLE = "That did not go through: the connection dropped or the server failed. Check your connection and try again.";

/**
 * useActionState for a form whose server action returns FormState. On an error (a refused field, or no connection)
 * the submitted values come back through `value` to refill the form. Give the form `key={key}`: React's own reset
 * after an action puts a <select> back to its first default, so the form is remounted with the right defaults instead.
 */
export function useFormAction<S extends FormState = FormState>(act: (prev: S, form: FormData) => Promise<S>) {
  const [state, action, pending] = useActionState<S & Extra, FormData>(async (prev, form) => {
    let res: S | undefined;
    try {
      res = await act(prev as S, form);
    } catch {
      res = { error: UNREACHABLE } as S;
    }
    // `res` is undefined for an action that returns nothing (one that redirects on success).
    const done = (prev.done ?? 0) + 1;
    return res?.error ? { ...res, values: Object.fromEntries(form), done } : { ...res, done };
  }, {} as Awaited<S & Extra>);
  /** What was submitted for `name` if the last save failed, else `fallback` (the saved value). */
  const value = (name: string, fallback?: string | number | null) => String(state.values?.[name] ?? fallback ?? "");
  return { state, action, pending, value, key: state.done ?? 0 };
}
