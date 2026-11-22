"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "formAction"> & { formAction?: (form: FormData) => Promise<unknown> };

/**
 * A submit button that refuses a second press while its form's server action runs, so a slow save cannot be sent twice.
 * It uses aria-disabled, not disabled: disabling the focused button drops keyboard focus to the top of the page.
 * A `formAction` that fails (no connection, server error) shows an alert under the button instead of the error page,
 * and puts back what was typed in the form (React resets a form after its action, even one that failed).
 */
export function SubmitButton({ children, className = "btn", onClick, formAction, ...rest }: Props) {
  const { pending } = useFormStatus();
  const [failed, setFailed] = useState<FormData | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const form = ref.current?.form;
    if (!failed || !form) return;
    for (const [name, typed] of failed) {
      const field = form.elements.namedItem(name);
      if ((field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) && typeof typed === "string") field.value = typed;
    }
  }, [failed]);
  const guarded =
    formAction &&
    (async (form: FormData) => {
      try {
        await formAction(form);
        startTransition(() => setFailed(null));
      } catch {
        // In a transition, so it commits together with React's form reset and the effect above runs after it.
        startTransition(() => setFailed(form));
      }
    });
  return (
    <>
      <button
        {...rest}
        ref={ref}
        className={className}
        formAction={guarded}
        aria-disabled={pending || undefined}
        aria-busy={pending || undefined}
        onClick={(e) => (pending ? e.preventDefault() : onClick?.(e))}
      >
        {children}
      </button>
      {failed && (
        <span className="error action-error" role="alert">
          Not sent: the connection dropped or the server failed. Try again.
        </span>
      )}
    </>
  );
}
