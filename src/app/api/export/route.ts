import { db } from "@/db/index.ts";
import { listApplications } from "@/lib/data.ts";
import { hasCalendarStep, nextStepsIcs } from "@/lib/ics.ts";
import { isSignedIn } from "@/lib/session.ts";
import { exportCsv, exportJson } from "@/lib/transfer.ts";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isSignedIn())) return new Response("Sign in first.", { status: 401 });
  const params = new URL(req.url).searchParams;
  const format = params.get("format");
  const stamp = new Date().toISOString().slice(0, 10);
  const noStore = { "cache-control": "no-store" };
  if (format === "csv")
    return new Response(exportCsv(db()), {
      headers: { ...noStore, "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="offerlog-${stamp}.csv"` },
    });
  if (format === "json")
    return new Response(JSON.stringify(exportJson(db()), null, 2), {
      headers: { ...noStore, "content-type": "application/json", "content-disposition": `attachment; filename="offerlog-${stamp}.json"` },
    });
  if (format === "ics") {
    // Optional id: the one application's next step, for "Add to calendar" on its page.
    const id = params.get("id");
    if (id !== null && !/^[1-9]\d{0,9}$/.test(id)) return new Response("id must be an application number", { status: 400 });
    const apps = listApplications(db()).filter((a) => id === null || a.id === Number(id));
    if (id !== null && !apps.some(hasCalendarStep)) return new Response("No open next step with a due date.", { status: 404 });
    const name = id === null ? `offerlog-next-steps-${stamp}.ics` : `offerlog-next-step-${id}.ics`;
    return new Response(nextStepsIcs(apps), {
      headers: { ...noStore, "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="${name}"` },
    });
  }
  return new Response("format must be csv, json or ics", { status: 400 });
}
