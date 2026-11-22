import { db } from "@/db/index.ts";
import { isSignedIn } from "@/lib/session.ts";
import { exportCsv, exportJson } from "@/lib/transfer.ts";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isSignedIn())) return new Response("Sign in first.", { status: 401 });
  const format = new URL(req.url).searchParams.get("format");
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
  return new Response("format must be csv or json", { status: 400 });
}
