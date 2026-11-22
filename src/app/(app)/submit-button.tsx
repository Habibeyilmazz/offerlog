"use client";

import { useFormStatus } from "react-dom";

/** A submit button that disables itself while its form's server action runs, so a slow save cannot be sent twice. */
export function SubmitButton({ children, className = "btn", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} className={className} disabled={pending || rest.disabled} aria-busy={pending || undefined}>
      {children}
    </button>
  );
}
