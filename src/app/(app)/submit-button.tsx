"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "formAction"> & { formAction?: (form: FormData) => Promise<unknown> };

/**
 * A submit button that refuses a second press while its form's server action runs, so a slow save cannot be sent twice.
 * It uses aria-disabled, not disabled: disabling the focused button drops keyboard focus to the top of the page.
 * A `formAction` that fails (no connection, server error) shows an alert under the button instead of the error page.
 */
export function SubmitButton({ children, className = "btn", onClick, formAction, ...rest }: Props) {
  const { pending } = useFormStatus();
  const [failed, setFailed] = useState(false);
  const guarded =
    formAction &&
    (async (form: FormData) => {
      try {
        await formAction(form);
        setFailed(false);
      } catch {
        setFailed(true);
      }
    });
  return (
    <>
      <button
        {...rest}
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
