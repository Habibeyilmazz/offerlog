import { requireUser } from "@/lib/session.ts";
import { ImportForm } from "./import-form.tsx";

export default async function DataPage() {
  await requireUser();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Import &amp; export</h1>
          <p className="muted">Your data lives in one SQLite file on your machine. Take it with you whenever you like.</p>
        </div>
      </div>
      <div className="grid-2">
        <section className="panel" aria-labelledby="export-h">
          <h2 id="export-h">Export</h2>
          <p className="muted" style={{ marginBottom: 14 }}>
            JSON is a full backup: applications with contacts, notes and history, the question bank and your weekly goal. CSV holds one row
            per application for spreadsheets.
          </p>
          <div className="form-actions" style={{ marginTop: 0 }}>
            <a className="btn" href="/api/export?format=json" download>
              Download JSON
            </a>
            <a className="btn secondary" href="/api/export?format=csv" download>
              Download CSV
            </a>
          </div>
        </section>
        <section className="panel" aria-labelledby="import-h">
          <h2 id="import-h">Import</h2>
          <p className="muted" style={{ marginBottom: 14 }}>
            Adds records next to what you already have. A CSV needs <code>company</code> and <code>role</code> columns; the other columns
            match the export. If any row is invalid, nothing is imported and the error names the row.
          </p>
          <ImportForm />
        </section>
      </div>
    </>
  );
}
