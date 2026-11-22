import { sql } from "drizzle-orm";
import { db } from "@/db/index.ts";

export const dynamic = "force-dynamic";

/** Unauthenticated liveness check that also opens (and migrates) the database. */
export function GET() {
  db().run(sql`select 1`);
  return Response.json({ ok: true });
}
