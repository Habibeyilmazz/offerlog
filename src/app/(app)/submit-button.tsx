"use client";

import { useFormStatus } from "react-dom";

/**
 * A submit button that refuses a second press while its form's server action runs, so a slow save cannot be sent twice.
 * It uses aria-disabled, not disabled: disabling the focused button drops keyboard focus to the top of the page.
 */
export function SubmitButton({ children, className = "btn", onClick, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button
      {...rest}
      className={className}
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      onClick={(e) => (pending ? e.preventDefault() : onClick?.(e))}
    >
      {children}
    </button>
  );
}
