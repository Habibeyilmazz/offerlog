import { db } from "@/db/index.ts";
import { aiEnabled } from "@/lib/ai.ts";
import { listApplications } from "@/lib/data.ts";
import { requireUser } from "@/lib/session.ts";
import { Tailor } from "./tailor.tsx";

export const metadata = { title: "Resume tailor" };

export default async function TailorPage({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  await requireUser();
  const jobs = listApplications(db())
    .filter((a) => a.description)
    .map((a) => ({ id: a.id, label: `${a.company}, ${a.role}`, description: a.description }));
  const initial = Number((await searchParams).app);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Resume tailor</h1>
          <p className="muted">
            Paste a job description and your resume as plain text or Markdown. The gap report runs locally with a fixed vocabulary, so the
            same input always gives the same result.
          </p>
        </div>
      </div>
      <Tailor jobs={jobs} initialJob={jobs.some((j) => j.id === initial) ? initial : null} ai={aiEnabled()} />
    </>
  );
}
