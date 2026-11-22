"use client";

import Link from "next/link";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel state-panel" role="alert">
      <h1>That did not work</h1>
      <p className="muted">The page or the last action failed on the server. Your saved data is untouched. Try again, or go back to the board.</p>
      <div className="form-actions">
        <button className="btn" onClick={reset}>
          Try again
        </button>
        <Link href="/">Back to the board</Link>
      </div>
    </div>
  );
}
