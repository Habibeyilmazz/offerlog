import { requireUser } from "@/lib/session.ts";
import { ApplicationForm } from "../../application-form.tsx";

export const metadata = { title: "Add application" };

export default async function NewApplicationPage() {
  await requireUser();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Add application</h1>
          <p className="muted">Only company and role are required. Everything else can wait.</p>
        </div>
      </div>
      <div className="panel" style={{ maxWidth: 900 }}>
        <ApplicationForm />
      </div>
    </>
  );
}
