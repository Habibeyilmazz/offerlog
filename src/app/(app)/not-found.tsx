import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel state-panel">
      <h1>Nothing here</h1>
      <p className="muted">This application may have been deleted, or the link is mistyped.</p>
      <div className="form-actions">
        <Link href="/" className="btn">
          Back to the board
        </Link>
      </div>
    </div>
  );
}
